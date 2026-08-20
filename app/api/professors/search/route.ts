import { requireUser, supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { searchAuthors } from "@/lib/discover";
import { isLikelyFacultyCacheRow } from "@/lib/facultyFilter";

export const maxDuration = 30;

/** Search professors on OpenAlex by country / university / field / keyword. */
export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  const facultyOnly = b.faculty_only !== false && b.facultyOnly !== false;
  try {
    const { results, total, debug } = await searchAuthors({
      country: String(b.country || "").trim() || undefined,
      institutionId: String(b.institutionId || "").trim() || undefined,
      conceptId: String(b.conceptId || "").trim() || undefined,
      conceptIds: Array.isArray(b.conceptIds) ? b.conceptIds.map((x: any) => String(x)).filter(Boolean) : undefined,
      subfieldIds: Array.isArray(b.subfieldIds) ? b.subfieldIds.map((x: any) => String(x)).filter(Boolean) : undefined,
      query: String(b.query || "").trim() || undefined,
      page: Number(b.page) || 1,
      facultyOnly,
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
        if (c?.email) { r.email = c.email; r.email_confidence = c.confidence; r.source = "openalex"; }
      }
    }

    // Also surface professors from OUR harvested email cache that match the
    // SAME filters the user picked (country, university, field, name). These
    // already have an email, so they're the most contactable — show them at the
    // top. Only on page 1 to avoid repeating them across pages.
    const page = Number(b.page) || 1;
    const country = String(b.country || "").trim();
    const q = String(b.query || "").trim();
    const institutionLabel = String(b.institutionLabel || "").trim();
    const conceptLabels: string[] = Array.isArray(b.conceptLabels)
      ? b.conceptLabels.map((x: any) => String(x || "").trim()).filter(Boolean)
      : [];
    if (page === 1 && (country || q || institutionLabel || conceptLabels.length)) {
      const present = new Set((results as any[]).map((r) => r.openalex_id));
      let qb = supabaseAdmin()
        .from("professor_emails")
        .select("openalex_id,name,email,institution,field,country,confidence")
        .not("email", "is", null)
        .limit(50);
      if (country) qb = qb.ilike("country", country); // stored lowercase, ilike is case-insensitive
      if (q) qb = qb.ilike("name", `%${q}%`);
      // Respect the chosen university: mined rows must match its name.
      if (institutionLabel) qb = qb.ilike("institution", `%${institutionLabel}%`);
      // Respect the chosen field(s): mined "field" must contain one of the labels.
      // Quote patterns for PostgREST so multi-word names like "Artificial Intelligence" work.
      if (conceptLabels.length) {
        const ors = conceptLabels
          .map((l) => l.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .map((l) => {
            const esc = l.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/"/g, "");
            return `field.ilike."%${esc}%"`;
          })
          .join(",");
        if (ors) qb = qb.or(ors);
      }
      const { data: mined } = await qb;
      const extra = (mined || [])
        .filter((c: any) => c.openalex_id && !present.has(c.openalex_id))
        .filter((c: any) => !facultyOnly || isLikelyFacultyCacheRow(c))
        .map((c: any) => ({
          openalex_id: c.openalex_id,
          name: c.name || "",
          orcid: null,
          institution: c.institution || "",
          country: c.country || "",
          topics: c.field || "",
          works_count: 0,
          cited_by_count: 0,
          email: c.email,
          email_confidence: c.confidence,
          source: "cache",
          faculty_confidence: "likely_faculty" as const,
        }));
      if (extra.length) (results as any[]).unshift(...extra);
    }

    return json({ results, total, debug, faculty_only: facultyOnly });
  } catch (e) {
    return err((e as Error).message || "Search failed", 502);
  }
}
