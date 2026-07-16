import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { sendEmailRow } from "@/lib/send";

const MAP: Record<string, string> = { pause: "paused", resume: "scheduled", cancel: "cancelled" };

export async function POST(_req: Request, { params }: { params: { id: string; action: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);

  if (params.action === "send-now") {
    const { data: email } = await sb.from("scheduled_emails").select("*").eq("id", params.id).maybeSingle();
    if (!email) return err("not found", 404);
    const res = await sendEmailRow(sb, user.id, email);
    const { data } = await sb.from("scheduled_emails").select("*").eq("id", params.id).maybeSingle();
    return json({ ...data, _send: res });
  }

  const target = MAP[params.action];
  if (!target) return err("unknown action");
  const { data, error } = await sb.from("scheduled_emails")
    .update({ status: target }).eq("id", params.id).select().single();
  if (error) return err(error.message, 500);
  return json(data);
}
