import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { sendEmailRow } from "@/lib/send";

const MAP: Record<string, string> = { pause: "paused", resume: "scheduled", cancel: "cancelled" };

export async function POST(req: Request, { params }: { params: { id: string; action: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);

  if (params.action === "send-now") {
    const { data: email } = await sb.from("scheduled_emails").select("*").eq("id", params.id).maybeSingle();
    if (!email) return err("not found", 404);
    const res = await sendEmailRow(sb, user.id, email);
    const { data } = await sb.from("scheduled_emails").select("*").eq("id", params.id).maybeSingle();
    return json({ ...data, _send: res });
  }

  // Reschedule a cancelled/failed (or any) email to a new time and re-queue it.
  if (params.action === "reschedule") {
    const body = await req.json().catch(() => ({} as { send_at?: string }));
    const raw = body?.send_at;
    const when = raw ? new Date(raw) : null;
    if (!when || isNaN(when.getTime())) return err("A valid send_at time is required");
    if (when.getTime() < Date.now() - 60_000) return err("Pick a time in the future");
    const { data, error } = await sb.from("scheduled_emails")
      .update({ status: "scheduled", send_at: when.toISOString(), error: null, sent_at: null })
      .eq("id", params.id).select().single();
    if (error) return err(error.message, 500);
    return json(data);
  }

  const target = MAP[params.action];
  if (!target) return err("unknown action");
  const { data, error } = await sb.from("scheduled_emails")
    .update({ status: target }).eq("id", params.id).select().single();
  if (error) return err(error.message, 500);
  return json(data);
}
