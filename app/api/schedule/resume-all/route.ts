import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** Resume every paused email (paused -> scheduled). */
export async function POST() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { data, error } = await sb
    .from("scheduled_emails")
    .update({ status: "scheduled" })
    .eq("status", "paused")
    .select("id");
  if (error) return err(error.message, 500);
  return json({ updated: (data || []).length });
}
