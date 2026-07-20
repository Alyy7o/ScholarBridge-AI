import { requireUser, supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { tick } from "@/lib/harvest";

export const maxDuration = 60;

/** Advance the background crawl by one page. Called by a 1-minute cron, or by the
 *  admin panel's "Run one batch" button. Auth: HARVEST_SECRET header or a user. */
export async function POST(req: Request) {
  const secret = process.env.HARVEST_SECRET || "";
  const ok = secret && (req.headers.get("x-harvest-secret") || "") === secret;
  if (!ok) {
    const { user } = await requireUser();
    if (!user) return err("Unauthorized", 401);
  }
  try {
    return json(await tick(supabaseAdmin()));
  } catch (e) {
    return err((e as Error).message || "Tick failed", 502);
  }
}
