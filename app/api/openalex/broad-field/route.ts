import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { resolveSubfield } from "@/lib/discover";

export const maxDuration = 15;

/** Resolve a broad area name (e.g. "Machine Learning") to its OpenAlex subfield,
 *  so the search covers the whole area instead of one narrow topic. */
export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q.trim()) return err("q is required");
  try {
    const sf = await resolveSubfield(q);
    return json({ result: sf });
  } catch (e) {
    return err((e as Error).message || "Could not resolve field", 502);
  }
}
