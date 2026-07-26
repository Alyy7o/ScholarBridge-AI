import { requireUser, supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { searchAuthors } from "@/lib/discover";

export const maxDuration = 30;

/** Search professors on OpenAlex by country / university / field / keyword. */
export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  try {
    const { results, total, debug } = await searchAuthors({
      country: String(b.country || "").trim() || undefined,
      institutionId: String(b.institutionId || "").trim() || undefined,
      conceptId: String(b.conceptId || "").trim() || undefined,
      conceptIds: Array.isArray(b.conceptIds) ? b.conceptIds.map((x: any) => String(x)).filter(Boolean) : undefined,
      query: String(b.query || "").trim() || undefined,
      page: Number(b.page) || 1,
    });

    // Attach any emails we already harvested — one batch lookup, so the table
    // can show contactable professors instantly instead of a per-row "Find".
    const ids = (results || []).map((r: any) => r.openalex_id).filter(Boolean);
    if (ids.length) {
      const { data: cached } = await supabaseAdmin()
        .from("professor_emails")
        .select("openalex_id,email,confidence")
        .in("openalex_id", ids);
      const map = new Map((cached || []).map((c: any) => [c.openalex_id, c]));
      for (const r of results as any[]) {
        const c = map.get(r.openalex_id);
        if (c?.email) { r.email = c.email; r.email_confidence = c.confidence; }
      }
    }

    return json({ results, total, debug });
  } catch (e) {
    return err((e as Error).message || "Search failed", 502);
  }
}
