import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { searchAuthors } from "@/lib/discover";

export const maxDuration = 30;

/** Search professors on OpenAlex by country / university / field / keyword. */
export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  try {
    const { results, total } = await searchAuthors({
      country: String(b.country || "").trim() || undefined,
      institutionId: String(b.institutionId || "").trim() || undefined,
      conceptId: String(b.conceptId || "").trim() || undefined,
      conceptIds: Array.isArray(b.conceptIds) ? b.conceptIds.map((x: any) => String(x)).filter(Boolean) : undefined,
      query: String(b.query || "").trim() || undefined,
      page: Number(b.page) || 1,
    });
    return json({ results, total });
  } catch (e) {
    return err((e as Error).message || "Search failed", 502);
  }
}
