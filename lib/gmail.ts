/** Gmail sending via the REST API using a stored Google refresh token. */

export async function accessTokenFromRefresh(
  refreshToken: string,
): Promise<{ token: string | null; error?: string }> {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return { token: null, error: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set on the server" };
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const j = await r.json().catch(() => ({} as Record<string, string>));
  if (!r.ok) {
    // Surface Google's real reason, e.g. invalid_client / invalid_grant.
    const detail = [j.error, j.error_description].filter(Boolean).join(": ");
    return { token: null, error: `Google token refresh failed (${r.status}) ${detail}`.trim() };
  }
  return { token: j.access_token ?? null };
}

export interface OutAttachment {
  filename: string;
  mime: string;
  data: Uint8Array;
}

function b64url(bytes: Uint8Array): string {
  const b64 = stdBase64Raw(bytes);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Standard base64 (RFC 4648) — required for MIME Content-Transfer-Encoding: base64. */
function stdBase64Raw(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** MIME base64 with 76-char line wraps (RFC 2045). */
function stdBase64(bytes: Uint8Array): string {
  const b64 = stdBase64Raw(bytes);
  return b64.replace(/(.{76})/g, "$1\r\n").replace(/\r\n$/g, "");
}

function safeFilename(name: string): string {
  return (name || "attachment")
    .replace(/[\r\n"\\]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .slice(0, 180) || "attachment";
}

function guessMime(filename: string): string {
  const ext = (filename || "").toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    odt: "application/vnd.oasis.opendocument.text",
    txt: "text/plain",
    rtf: "application/rtf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  return map[ext] || "application/octet-stream";
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

/** True if the body already contains our allowed rich-text markup. */
function looksHtml(s: string): boolean {
  return /<(?:b|strong|i|em|u|p|br|ul|ol|li|a|div|span)\b[^>]*>/i.test(s || "");
}

/** Allowlist-sanitize user rich text: keep basic formatting tags, drop the rest
 *  and every attribute except safe hrefs on links. */
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
  // Use <br> between lines and only a blank line for true paragraph breaks —
  // avoid per-line <p margin> gaps (Word-style plain extracts used to look double-spaced).
  const inner = asciiClean(text)
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n{2,}/)
    .map((p) => esc(p).replace(/\n/g, "<br>"))
    .join("<br><br>");
  return `<div style="${WRAP}">${inner}</div>`;
}

/** Render the body for the email: HTML bodies are sanitized and kept as markup;
 *  plain-text bodies are escaped and paragraph-formatted as before. */
function renderBody(body: string): string {
  if (looksHtml(body)) return `<div style="${WRAP}">${sanitizeHtml(body)}</div>`;
  return toHtml(body);
}

function buildMime(
  to: string,
  from: string,
  subject: string,
  body: string,
  attachments: OutAttachment[],
  replyTo?: string,
): string {
  const boundary = "sb_" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const parts: number[] = [];
  const push = (s: string) => enc.encode(s).forEach((b) => parts.push(b));

  push(`To: ${to}\r\nFrom: ${from}\r\nSubject: ${asciiClean(subject)}\r\n`);
  if (replyTo) push(`Reply-To: ${replyTo}\r\n`);
  push(`MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`);
  push(`--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${renderBody(body)}\r\n`);
  for (const a of attachments) {
    const mime = (a.mime || "").trim() || guessMime(a.filename);
    const filename = safeFilename(a.filename);
    const b64 = stdBase64(a.data);
    push(`--${boundary}\r\nContent-Type: ${mime}; name="${filename}"\r\n`);
    push(`Content-Disposition: attachment; filename="${filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n`);
    push(b64 + "\r\n");
  }
  push(`--${boundary}--`);
  return b64url(Uint8Array.from(parts));
}

export async function sendGmail(
  refreshToken: string,
  from: string,
  to: string,
  subject: string,
  body: string,
  attachments: OutAttachment[] = [],
  replyTo?: string,
): Promise<{ ok: boolean; info: string }> {
  const { token, error } = await accessTokenFromRefresh(refreshToken);
  if (!token) return { ok: false, info: error || "Could not refresh Google token" };
  const raw = buildMime(to, from || "me", subject, body, attachments, replyTo);
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!r.ok) return { ok: false, info: `Gmail ${r.status}: ${(await r.text()).slice(0, 200)}` };
  return { ok: true, info: "sent" };
}
