import { requireUser, supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** Start/pause the background crawl, or reset a country to re-crawl it. */
export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();

  if (typeof b.active === "boolean") {
    // Surface DB errors instead of silently returning ok — a swallowed error
    // makes the UI toggle snap back to off with no explanation.
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

  // Read back the live value so the client can trust the response.
  const { data } = await admin.from("harvest_control").select("active").eq("id", 1).maybeSingle();
  return json({ ok: true, active: !!data?.active });
}
