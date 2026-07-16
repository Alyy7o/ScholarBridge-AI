import type { SupabaseClient } from "@supabase/supabase-js";
import { sendGmail, type OutAttachment } from "./gmail";

async function logSend(sb: SupabaseClient, userId: string, emailId: string, status: string, detail: string) {
  await sb.from("email_logs").insert({ user_id: userId, email_id: emailId, status, detail });
}

/** Send one email row (real Gmail if connected, else dry-run). Updates status + logs. */
export async function sendEmailRow(
  sb: SupabaseClient,
  userId: string,
  email: any,
): Promise<{ status: string; info: string }> {
  const { data: profile } = await sb
    .from("profiles")
    .select("gmail_refresh_token,gmail_email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.gmail_refresh_token) {
    await sb.from("scheduled_emails")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .eq("id", email.id);
    await logSend(sb, userId, email.id, "sent", "dry-run (Gmail not connected)");
    return { status: "sent", info: "dry-run" };
  }

  const atts: OutAttachment[] = [];
  for (const aid of email.attachment_ids || []) {
    const { data: meta } = await sb.from("attachments").select("*").eq("id", aid).maybeSingle();
    if (!meta) continue;
    const dl = await sb.storage.from("attachments").download(meta.storage_path);
    if (dl.data) {
      atts.push({
        filename: meta.filename,
        mime: meta.mime || "application/octet-stream",
        data: new Uint8Array(await dl.data.arrayBuffer()),
      });
    }
  }

  const res = await sendGmail(
    profile.gmail_refresh_token, profile.gmail_email || "me",
    email.email, email.subject, email.body, atts,
  );
  if (res.ok) {
    await sb.from("scheduled_emails")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .eq("id", email.id);
    await logSend(sb, userId, email.id, "sent", "sent");
    return { status: "sent", info: "sent" };
  }
  await sb.from("scheduled_emails")
    .update({ status: "failed", attempts: (email.attempts || 0) + 1, error: res.info })
    .eq("id", email.id);
  await logSend(sb, userId, email.id, "failed", res.info);
  return { status: "failed", info: res.info };
}
