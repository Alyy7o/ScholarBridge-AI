import { requireAdmin } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** Start/pause the background crawl, or reset a country to re-crawl it. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const b = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();

  if (typeof b.active === "boolean") {
    const { error } = await admin
      .from("harvest_control")
      .upsert({ id: 1, active: b.active, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) return err(`Could not update crawl state: ${error.message}`, 500);
  }

  if (b.reset && /^[a-z]{2}$/.test(String(b.reset))) {
    const { error } = await admin.from("harvest_state").upsert(
      { country: String(b.reset), cursor: "*", status: "pending", papers: 0, emails: 0, updated_at: new Date().toISOString() },
      { onConflict: "country" },
    );
    if (error) return err(`Could not reset ${b.reset}: ${error.message}`, 500);
  }

  if (b.pause && /^[a-z]{2}$/.test(String(b.pause))) {
    const { error } = await admin.from("harvest_state")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("country", String(b.pause));
    if (error) return err(`Could not pause ${b.pause}: ${error.message}`, 500);
  }
  if (b.resume && /^[a-z]{2}$/.test(String(b.resume))) {
    const { error } = await admin.from("harvest_state")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("country", String(b.resume));
    if (error) return err(`Could not resume ${b.resume}: ${error.message}`, 500);
  }

  const { data } = await admin.from("harvest_control").select("active").eq("id", 1).maybeSingle();
  return json({ ok: true, active: !!data?.active });
}
