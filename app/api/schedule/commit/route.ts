import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { generateSlots } from "@/lib/scheduler";
import type { ScheduleConfig } from "@/lib/types";

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { emails = [], schedule = {}, attachment_ids = [] } = await req.json();
  if (!emails.length) return err("No emails to schedule.");
  const cfg = schedule as ScheduleConfig;
  const slots = generateSlots(emails.length, cfg);

  const rows = emails.map((e: any, i: number) => {
    const send_at = slots[i] || null;
    return {
      user_id: user.id, professor_name: e.professor_name || "", email: e.email,
      university: e.university || "", topics: e.topics || "", subject: e.subject || "",
      body: e.body || "", personalized: e.personalized || "", send_at,
      status: send_at ? "scheduled" : "draft", workflow: e.workflow || "",
      research_source: e.research_source || "none", papers_used: e.papers_used || [],
      attachment_ids,
    };
  });
  const { data, error } = await sb.from("scheduled_emails").insert(rows).select();
  if (error) return err(error.message, 500);
  return json({
    scheduled: (data || []).filter((d) => d.status === "scheduled").length,
    drafts: (data || []).filter((d) => d.status === "draft").length,
    emails: data,
  });
}
