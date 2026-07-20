// Supabase Edge Function (Deno) — the cron sender.
// Runs on a schedule (pg_cron), finds every due scheduled email across all
// users, and sends it via Gmail using the owner's stored refresh token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function b64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(refresh: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("token refresh: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set on the function");
    return null;
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refresh, grant_type: "refresh_token",
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    console.error("token refresh failed:", r.status, body.slice(0, 300));
    return null;
  }
  return (await r.json()).access_token ?? null;
}

function asciiClean(str: string): string {
  return (str || "")
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\u00E2\u20AC\u201D/g, "-")
    .replace(/\u00E2\u20AC\u2122/g, "'")
    .replace(/\u00E2\u20AC\u0153/g, '"')
    .replace(/\u00E2\u20AC\u009D/g, '"');
}
const WRAP = 'font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a';
function looksHtml(s: string): boolean {
  return /<(?:b|strong|i|em|u|p|br|ul|ol|li|a|div|span)\b[^>]*>/i.test(s || "");
}
function sanitizeHtml(s: string): string {
  const allowed = new Set(["b", "strong", "i", "em", "u", "p", "br", "ul", "ol", "li", "a", "div", "span"]);
  let x = asciiClean(s || "");
  x = x.replace(/<!--[\s\S]*?-->/g, "");
  x = x.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  x = x.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (_m, slash, tag, attrs) => {
    const t = String(tag).toLowerCase();
    if (!allowed.has(t)) return "";
    if (slash) return `</${t}>`;
    if (t === "a") {
      const m = String(attrs).match(/href\s*=\s*"(https?:\/\/[^"]*|mailto:[^"]*)"/i);
      return m ? `<a href="${m[1]}" target="_blank" rel="noopener">` : "<a>";
    }
    return `<${t}>`;
  });
  return x;
}
function toHtml(text: string): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = asciiClean(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="${WRAP}">${paras}</div>`;
}
function renderBody(body: string): string {
  if (looksHtml(body)) return `<div style="${WRAP}">${sanitizeHtml(body)}</div>`;
  return toHtml(body);
}

async function buildRaw(to: string, from: string, subject: string, body: string,
                        atts: { filename: string; mime: string; data: Uint8Array }[]): Promise<string> {
  const boundary = "sb_" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const push = (s: string) => chunks.push(enc.encode(s));
  push(`To: ${to}\r\nFrom: ${from}\r\nSubject: ${asciiClean(subject)}\r\nMIME-Version: 1.0\r\n`);
  push(`Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`);
  push(`--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${renderBody(body)}\r\n`);
  for (const a of atts) {
    push(`--${boundary}\r\nContent-Type: ${a.mime}; name="${a.filename}"\r\n`);
    push(`Content-Disposition: attachment; filename="${a.filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n`);
    push(b64url(a.data) + "\r\n"); // base64url is accepted by Gmail for the part body via standard base64; use std:
  }
  push(`--${boundary}--`);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  return b64url(merged);
}

async function sendOne(email: any): Promise<{ ok: boolean; info: string }> {
  const { data: prof } = await admin.from("profiles")
    .select("gmail_refresh_token,gmail_email").eq("id", email.user_id).maybeSingle();
  if (!prof?.gmail_refresh_token) return { ok: false, info: "no gmail token" };
  const token = await accessToken(prof.gmail_refresh_token);
  if (!token) return { ok: false, info: "token refresh failed" };

  const atts: { filename: string; mime: string; data: Uint8Array }[] = [];
  for (const aid of email.attachment_ids || []) {
    const { data: meta } = await admin.from("attachments").select("*").eq("id", aid).maybeSingle();
    if (!meta) continue;
    const dl = await admin.storage.from("attachments").download(meta.storage_path);
    if (dl.data) atts.push({ filename: meta.filename, mime: meta.mime || "application/octet-stream", data: new Uint8Array(await dl.data.arrayBuffer()) });
  }
  const raw = await buildRaw(email.email, prof.gmail_email || "me", email.subject, email.body, atts);
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!r.ok) return { ok: false, info: `gmail ${r.status}` };
  return { ok: true, info: "sent" };
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const nowIso = new Date().toISOString();
  const { data: due } = await admin.from("scheduled_emails").select("*")
    .eq("status", "scheduled").not("send_at", "is", null).lte("send_at", nowIso)
    .order("send_at", { ascending: true }).limit(200);

  let sent = 0, failed = 0;
  for (const e of due || []) {
    const res = await sendOne(e);
    if (res.ok) {
      await admin.from("scheduled_emails").update({ status: "sent", sent_at: nowIso, error: null }).eq("id", e.id);
      sent++;
    } else {
      await admin.from("scheduled_emails").update({ status: "failed", attempts: (e.attempts || 0) + 1, error: res.info }).eq("id", e.id);
      failed++;
    }
    await admin.from("email_logs").insert({ user_id: e.user_id, email_id: e.id, status: res.ok ? "sent" : "failed", detail: res.info });
  }
  return new Response(JSON.stringify({ processed: (due || []).length, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
