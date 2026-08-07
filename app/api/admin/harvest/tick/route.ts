import { requireAdmin, harvestSecretOk } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { tick } from "@/lib/harvest";

export const maxDuration = 60;

/** Advance the background crawl by one page. Auth: HARVEST_SECRET or admin user. */
export async function POST(req: Request) {
  if (!harvestSecretOk(req)) {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
  }
  try {
    return json(await tick(supabaseAdmin()));
  } catch (e) {
    return err((e as Error).message || "Tick failed", 502);
  }
}
