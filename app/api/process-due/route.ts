import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { sendEmailRow } from "@/lib/send";

export async function POST() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const nowIso = new Date().toISOString();
  const { data: due } = await sb.from("scheduled_emails").select("*")
    .eq("status", "scheduled").not("send_at", "is", null).lte("send_at", nowIso)
    .order("send_at", { ascending: true });
  let sent = 0, failed = 0;
  for (const e of due || []) {
    const r = await sendEmailRow(sb, user.id, e);
    r.status === "sent" ? sent++ : failed++;
  }
  const { data: profile } = await sb.from("profiles").select("gmail_refresh_token").eq("id", user.id).maybeSingle();
  return json({ processed: (due || []).length, sent, failed, dry_run: !profile?.gmail_refresh_token });
}
