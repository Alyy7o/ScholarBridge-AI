import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { isAiEnabled } from "@/lib/personalize";
import { isAdminRole } from "@/lib/roles";

export async function GET() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);

  const { data: emails } = await sb.from("scheduled_emails").select("status,sent_at");
  const counts: Record<string, number> = {};
  (emails || []).forEach((e) => (counts[e.status] = (counts[e.status] || 0) + 1));
  const dayAgo = Date.now() - 86400_000;
  const sentToday = (emails || []).filter(
    (e) => e.status === "sent" && e.sent_at && new Date(e.sent_at).getTime() >= dayAgo,
  ).length;

  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const quota = profile?.daily_quota ?? 20;
  const role = isAdminRole(profile?.role, profile?.email || user.email) ? "admin" : "user";

  const [{ count: templates }, { count: professors }, { count: attachments }] = await Promise.all([
    sb.from("email_templates").select("*", { count: "exact", head: true }),
    sb.from("professors").select("*", { count: "exact", head: true }),
    sb.from("attachments").select("*", { count: "exact", head: true }),
  ]);

  return json({
    stats: {
      total: (emails || []).length,
      scheduled: counts.scheduled || 0,
      sent: counts.sent || 0,
      failed: counts.failed || 0,
      paused: counts.paused || 0,
      draft: counts.draft || 0,
      cancelled: counts.cancelled || 0,
      sent_today: sentToday,
      daily_quota: quota,
      remaining_quota: Math.max(0, quota - sentToday),
    },
    gmail: {
      connected: !!profile?.gmail_refresh_token,
      email: profile?.gmail_email || null,
      needs_reconnect: !!profile?.gmail_needs_reconnect,
    },
    ai_enabled: isAiEnabled(),
    role,
    templates: templates || 0,
    professors: professors || 0,
    attachments: attachments || 0,
    sender_name: profile?.sender_name || "",
    ai_background: profile?.ai_background || "",
    university: profile?.university || "",
    cgpa: profile?.cgpa || "",
    work_blurb: profile?.work_blurb || "",
    phone: profile?.phone || "",
    linkedin_url: profile?.linkedin_url || "",
    target_intake: profile?.target_intake || "",
    email: profile?.email || user.email || "",
  });
}
