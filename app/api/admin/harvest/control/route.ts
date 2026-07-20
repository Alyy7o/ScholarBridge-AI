import { requireUser, supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** Start/pause the background crawl, or reset a country to re-crawl it. */
export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();

  if (typeof b.active === "boolean") {
    await admin.from("harvest_control").upsert({ id: 1, active: b.active, updated_at: new Date().toISOString() }, { onConflict: "id" });
  }
  if (b.reset && /^[a-z]{2}$/.test(String(b.reset))) {
    await admin.from("harvest_state").upsert(
      { country: String(b.reset), cursor: "*", status: "pending", papers: 0, emails: 0, updated_at: new Date().toISOString() },
      { onConflict: "country" },
    );
  }
  return json({ ok: true });
}
