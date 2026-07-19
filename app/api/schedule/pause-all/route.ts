import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** Pause every scheduled email (scheduled -> paused). */
export async function POST() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { data, error } = await sb
    .from("scheduled_emails")
    .update({ status: "paused" })
    .eq("status", "scheduled")
    .select("id");
  if (error) return err(error.message, 500);
  return json({ updated: (data || []).length });
}
