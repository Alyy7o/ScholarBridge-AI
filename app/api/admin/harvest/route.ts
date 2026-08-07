import { requireAdmin, harvestSecretOk } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { crawlCountry } from "@/lib/harvest";

export const maxDuration = 60;

/**
 * Batch-crawl one country. Auth: HARVEST_SECRET or admin user.
 * Body: { country: "cn", cursor?: "*" }
 */
export async function POST(req: Request) {
  if (!harvestSecretOk(req)) {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
  }

  const b = await req.json().catch(() => ({}));
  const country = String(b.country || "").trim().toLowerCase();
  const cursor = String(b.cursor || "*");
  if (!/^[a-z]{2}$/.test(country)) return err("country must be a 2-letter ISO code, e.g. cn");
  try {
    const admin = supabaseAdmin();
    const { data: state } = await admin.from("harvest_state").select("status").eq("country", country).maybeSingle();
    if (state?.status === "paused") return json({ country, skipped: "paused", processed: 0, stored: 0, next: null });
    const r = await crawlCountry(admin, country, cursor);
    return json({ country, ...r });
  } catch (e) {
    return err((e as Error).message || "Crawl failed", 502);
  }
}
