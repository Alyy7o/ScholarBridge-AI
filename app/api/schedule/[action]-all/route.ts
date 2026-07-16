import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export async function POST(_req: Request, { params }: { params: { action: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const action = params.action;
  if (action !== "pause" && action !== "resume") return err("unknown action");
  const src = action === "pause" ? "scheduled" : "paused";
  const dst = action === "pause" ? "paused" : "scheduled";
  const { data } = await sb.from("scheduled_emails").update({ status: dst }).eq("status", src).select("id");
  return json({ updated: (data || []).length });
}
