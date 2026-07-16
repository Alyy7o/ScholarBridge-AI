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
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refresh, grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  return (await r.json()).access_token ?? null;
}

async function buildRaw(to: string, from: string, subject: string, body: string,
                        atts: { filename: string; mime: string; data: Uint8Array }[]): Promise<string> {
  const boundary = "sb_" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const push = (s: string) => chunks.push(enc.encode(s));
  push(`To: ${to}\r\nFrom: ${from}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\n`);
  push(`Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`);
  push(`--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}\r\n`);
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
