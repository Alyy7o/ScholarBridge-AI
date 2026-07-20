import { requireUser } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { harvestForAuthor } from "@/lib/harvest";

export const maxDuration = 45;

/**
 * Email for one professor: served instantly from the shared cache when known,
 * otherwise scraped from their recent open-access papers (first page only) and
 * cached — along with every co-author found on those papers.
 */
export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  const id = String(b.openalex_id || "").trim();
  const name = String(b.name || "").trim();
  if (!id || !name) return err("openalex_id and name required");
  try {
    const r = await harvestForAuthor(supabaseAdmin(), id, name);
    return json({ email: r.email, confidence: r.confidence });
  } catch (e) {
    return err((e as Error).message || "Lookup failed", 502);
  }
}
