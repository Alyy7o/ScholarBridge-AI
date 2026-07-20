import { requireUser, supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { crawlCountry } from "@/lib/harvest";

export const maxDuration = 60;

/**
 * Batch-crawl one country's recent open-access papers to pre-fill the email
 * cache. Processes one page per call and returns a cursor to continue; run it
 * repeatedly (or from a scheduled task) until `next` is null.
 *
 * Auth: a signed-in user, OR an "x-harvest-secret" header matching the
 * HARVEST_SECRET env var (so the runner script / a cron can call it headless).
 *
 * Priority order for now: cn, jp, kr, tw, sg.
 * Body: { country: "cn", cursor?: "*" }
 */
export async function POST(req: Request) {
  const secret = process.env.HARVEST_SECRET || "";
  const headerSecret = req.headers.get("x-harvest-secret") || "";
  const bySecret = secret && headerSecret === secret;
  if (!bySecret) {
    const { user } = await requireUser();
    if (!user) return err("Unauthorized", 401);
  }

  const b = await req.json().catch(() => ({}));
  const country = String(b.country || "").trim().toLowerCase();
  const cursor = String(b.cursor || "*");
  if (!/^[a-z]{2}$/.test(country)) return err("country must be a 2-letter ISO code, e.g. cn");
  try {
    const r = await crawlCountry(supabaseAdmin(), country, cursor);
    return json({ country, ...r });
  } catch (e) {
    return err((e as Error).message || "Crawl failed", 502);
  }
}
