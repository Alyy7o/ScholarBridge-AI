import { json, err } from "@/lib/http";
import { sendContactMessage } from "@/lib/contact-mail";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, max);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  // Honeypot — bots fill hidden fields; humans leave it empty.
  if (clean(body.company, 80)) {
    return json({ ok: true });
  }

  const name = clean(body.name, 100);
  const email = clean(body.email, 200).toLowerCase();
  const subject = clean(body.subject, 160);
  const message = clean(body.message, 5000);

  if (!name || name.length < 2) return err("Please enter your name.");
  if (!email || !EMAIL_RE.test(email)) return err("Please enter a valid email.");
  if (!subject || subject.length < 3) return err("Please enter a subject.");
  if (!message || message.length < 10) return err("Please enter a message (at least 10 characters).");

  const res = await sendContactMessage({ name, email, subject, message });
  if (!res.ok) {
    console.error("[contact] send failed:", res.info);
    return err(res.info || "Could not send message. Try again later.", 502);
  }
  return json({ ok: true });
}
