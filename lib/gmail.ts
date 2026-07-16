/** Gmail sending via the REST API using a stored Google refresh token. */

export async function accessTokenFromRefresh(refreshToken: string): Promise<string | null> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.access_token ?? null;
}

export interface OutAttachment {
  filename: string;
  mime: string;
  data: Uint8Array;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildMime(to: string, from: string, subject: string, body: string, attachments: OutAttachment[]): string {
  const boundary = "sb_" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const parts: number[] = [];
  const push = (s: string) => enc.encode(s).forEach((b) => parts.push(b));

  push(`To: ${to}\r\nFrom: ${from}\r\nSubject: ${subject}\r\n`);
  push(`MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`);
  push(`--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}\r\n`);
  for (const a of attachments) {
    push(`--${boundary}\r\nContent-Type: ${a.mime || "application/octet-stream"}; name="${a.filename}"\r\n`);
    push(`Content-Disposition: attachment; filename="${a.filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n`);
    push((typeof Buffer !== "undefined" ? Buffer.from(a.data).toString("base64") : b64url(a.data)) + "\r\n");
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
): Promise<{ ok: boolean; info: string }> {
  const token = await accessTokenFromRefresh(refreshToken);
  if (!token) return { ok: false, info: "Could not refresh Google token" };
  const raw = buildMime(to, from || "me", subject, body, attachments);
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!r.ok) return { ok: false, info: `Gmail ${r.status}: ${(await r.text()).slice(0, 160)}` };
  return { ok: true, info: "sent" };
}
