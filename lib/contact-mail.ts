import { sendGmail } from "@/lib/gmail";
import { supabaseAdmin } from "@/lib/supabase";

const DEFAULT_TO = "alijaved.developer@gmail.com";

export function contactInbox(): string {
  return (process.env.CONTACT_TO_EMAIL || DEFAULT_TO).trim().toLowerCase();
}

/** Resolve a Gmail refresh token that can send contact-form mail. */
export async function resolveContactGmail(): Promise<{
  refreshToken: string;
  fromEmail: string;
} | null> {
  const envToken = (process.env.CONTACT_GMAIL_REFRESH_TOKEN || "").trim();
  const to = contactInbox();
  if (envToken) {
    return {
      refreshToken: envToken,
      fromEmail: (process.env.CONTACT_FROM_EMAIL || to).trim(),
    };
  }

  // Fallback: use the inbox owner's stored token if they've signed in with Gmail send.
  try {
    const { data } = await supabaseAdmin()
      .from("profiles")
      .select("gmail_refresh_token,gmail_email")
      .ilike("gmail_email", to)
      .not("gmail_refresh_token", "is", null)
      .maybeSingle();
    if (data?.gmail_refresh_token) {
      return {
        refreshToken: data.gmail_refresh_token,
        fromEmail: data.gmail_email || to,
      };
    }
  } catch (e) {
    console.error("[contact] profile lookup failed:", (e as Error).message);
  }
  return null;
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean; info: string }> {
  const creds = await resolveContactGmail();
  if (!creds) {
    return {
      ok: false,
      info:
        "Contact inbox is not connected. Sign in once with Google as the inbox account (Gmail send permission), or set CONTACT_GMAIL_REFRESH_TOKEN.",
    };
  }

  const to = contactInbox();
  const subject = `[ScholarBridge Contact] ${input.subject}`.slice(0, 180);
  const body = `
<p><b>Name:</b> ${esc(input.name)}</p>
<p><b>Email:</b> <a href="mailto:${esc(input.email)}">${esc(input.email)}</a></p>
<p><b>Subject:</b> ${esc(input.subject)}</p>
<hr style="border:none;border-top:1px solid #ddd;margin:16px 0" />
${esc(input.message)
  .split(/\n{2,}/)
  .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
  .join("")}
<p style="color:#666;font-size:12px;margin-top:24px">Sent from the ScholarBridge contact form. Reply to this email to answer ${esc(input.name)}.</p>
`.trim();

  return sendGmail(
    creds.refreshToken,
    creds.fromEmail,
    to,
    subject,
    body,
    [],
    input.email, // Reply-To → visitor
  );
}
