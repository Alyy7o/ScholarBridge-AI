import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { sendGmail } from "@/lib/gmail";

/** Send a one-off test email via the signed-in user's connected Gmail. */
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);

  let payload: { to?: string; subject?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const to = String(payload.to ?? "").trim();
  const subject = String(payload.subject ?? "").trim() || "ScholarBridge test email";
  const body =
    String(payload.body ?? "").trim() ||
    "This is a test email from ScholarBridge AI. If you received it, sending works.";
  if (!to.includes("@")) return err("A valid recipient email is required");

  const { data: profile } = await sb
    .from("profiles")
    .select("gmail_refresh_token,gmail_email")
    .eq("id", user.id)
    .maybeSingle();

  // No Gmail connected -> dry-run so the tester still gives clear feedback.
  if (!profile?.gmail_refresh_token) {
    return json({ ok: true, dry_run: true, to, info: "Gmail not connected (dry-run)" });
  }

  const res = await sendGmail(
    profile.gmail_refresh_token,
    profile.gmail_email || "me",
    to,
    subject,
    body,
  );
  if (!res.ok) return err(res.info || "Gmail send failed", 502);
  return json({ ok: true, dry_run: false, to, info: "sent" });
}
