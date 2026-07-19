// Professor discovery via OpenAlex (authors), plus a best-effort email lookup
// that scrapes corresponding-author emails from a professor's open-access papers
// (no scholarly API exposes emails directly).

const OPENALEX = "https://api.openalex.org";

function oaUrl(path: string, params: Record<string, string>): string {
  const p = new URLSearchParams(params);
  const key = process.env.OPENALEX_API_KEY;
  if (key) p.set("api_key", key);
  p.set("mailto", process.env.OPENALEX_MAILTO || "info@kleegr.com");
  return `${OPENALEX}${path}?${p.toString()}`;
}

async function oaJson(url: string): Promise<any> {
  const r = await fetch(url, { headers: { "User-Agent": "ScholarBridgeAI/0.1" } });
  if (!r.ok) throw new Error(`OpenAlex ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

export type AuthorHit = {
  openalex_id: string;
  name: string;
  orcid: string | null;
  institution: string;
  country: string;
  topics: string;
  works_count: number;
  cited_by_count: number;
};

export type AutocompleteItem = { id: string; label: string; hint?: string };

/** Autocomplete institutions or research fields (concepts) for the filter UI. */
export async function autocomplete(
  type: "institutions" | "concepts",
  q: string,
): Promise<AutocompleteItem[]> {
  if (!q.trim()) return [];
  const data = await oaJson(oaUrl(`/autocomplete/${type}`, { q }));
  return (data.results || []).slice(0, 8).map((r: any) => ({
    id: String(r.id || "").split("/").pop() || "",
    label: r.display_name || "",
    hint: r.hint || "",
  }));
}

export type SearchFilters = {
  country?: string;        // ISO code, e.g. "US"
  institutionId?: string;  // OpenAlex institution id (e.g. "I27837315")
  conceptId?: string;      // single OpenAlex concept id (legacy)
  conceptIds?: string[];   // multiple fields of research (OR-combined)
  query?: string;          // free-text name/keyword
  page?: number;
  perPage?: number;
};

/** Search professors/researchers by country, university and field. */
export async function searchAuthors(f: SearchFilters): Promise<{ results: AuthorHit[]; total: number }> {
  const filters: string[] = [];
  // A specific institution filters by ANY affiliation (broad). Only fall back to
  // a country filter when no institution is chosen — AND-ing both, plus concept,
  // plus has_orcid used to over-narrow searches down to zero results.
  if (f.institutionId) filters.push(`affiliations.institution.id:${f.institutionId}`);
  else if (f.country) filters.push(`last_known_institutions.country_code:${f.country.toLowerCase()}`);
  const conceptIds = (f.conceptIds && f.conceptIds.length ? f.conceptIds : f.conceptId ? [f.conceptId] : []).filter(Boolean);
  if (conceptIds.length) filters.push(`x_concepts.id:${conceptIds.join("|")}`);

  const params: Record<string, string> = {
    sort: "cited_by_count:desc",
    per_page: String(Math.min(f.perPage || 25, 50)),
    page: String(f.page || 1),
  };
  if (filters.length) params.filter = filters.join(",");
  if (f.query && f.query.trim()) params.search = f.query.trim();
  if (!params.filter && !params.search) return { results: [], total: 0 };

  const data = await oaJson(oaUrl("/authors", params));
  const results: AuthorHit[] = (data.results || []).map((a: any): AuthorHit => {
    const inst = (a.last_known_institutions || [])[0] || a.last_known_institution || {};
    return {
      openalex_id: String(a.id || "").split("/").pop() || "",
      name: a.display_name || "",
      orcid: a.orcid ? String(a.orcid).split("/").pop() || a.orcid : null,
      institution: inst.display_name || "",
      country: inst.country_code || "",
      topics: (a.x_concepts || []).slice(0, 5).map((c: any) => c.display_name).filter(Boolean).join(", "),
      works_count: a.works_count || 0,
      cited_by_count: a.cited_by_count || 0,
    };
  });
  return { results, total: data.meta?.count || results.length };
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function scoreEmail(email: string, name: string): number {
  const e = email.toLowerCase();
  const local = e.split("@")[0];
  const domain = e.split("@")[1] || "";
  const parts = name.toLowerCase().replace(/\./g, " ").split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || "";
  const first = parts[0] || "";
  let s = 0;
  if (last && local.includes(last)) s += 5;
  if (first && local.includes(first)) s += 2;
  if (first && last && local.includes(first[0] + last)) s += 3;
  if (/\.(edu|ac\.[a-z]{2}|edu\.[a-z]{2})$/.test(domain)) s += 2;
  // Penalise obvious non-personal / publisher addresses.
  if (/(info|admin|support|editor|journal|noreply|no-reply|contact|webmaster)@/.test(e)) s -= 6;
  if (/(gmail|yahoo|hotmail|outlook|qq)\.com$/.test(domain)) s -= 1;
  return s;
}

async function textFromWork(work: any): Promise<string> {
  const loc = work.best_oa_location || work.primary_location || {};
  const pdf = loc.pdf_url as string | undefined;
  const landing = loc.landing_page_url as string | undefined;
  const url = pdf || landing;
  if (!url) return "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, { headers: { "User-Agent": "ScholarBridgeAI/0.1" }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return "";
    const buf = Buffer.from(await r.arrayBuffer());
    if ((r.headers.get("content-type") || "").includes("pdf") || (pdf && !landing)) {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const parsed = await pdfParse(buf);
      return (parsed.text || "").slice(0, 6000);
    }
    // HTML landing page — strip tags, keep first chunk (emails are near the top).
    return buf.toString("utf-8").replace(/<[^>]+>/g, " ").slice(0, 8000);
  } catch {
    return "";
  }
}

/**
 * Best-effort email for an author: scan their most recent open-access works for
 * a corresponding-author email whose local part matches the professor's name.
 * Returns null if nothing convincing is found.
 */
export async function findAuthorEmail(
  authorId: string,
  name: string,
): Promise<{ email: string | null; confidence: "high" | "low" | null }> {
  const params: Record<string, string> = {
    filter: `authorships.author.id:${authorId},open_access.is_oa:true`,
    sort: "publication_date:desc",
    per_page: "6",
    select: "title,best_oa_location,primary_location",
  };
  let works: any[] = [];
  try {
    works = (await oaJson(oaUrl("/works", params))).results || [];
  } catch {
    return { email: null, confidence: null };
  }
  const candidates: Record<string, number> = {};
  for (const w of works) {
    const text = await textFromWork(w);
    if (!text) continue;
    const found = text.match(EMAIL_RE) || [];
    for (const raw of found.slice(0, 40)) {
      const email = raw.toLowerCase().replace(/\.$/, "");
      candidates[email] = Math.max(candidates[email] ?? -99, scoreEmail(email, name));
    }
    // Stop early once we have a strong match.
    if (Object.values(candidates).some((v) => v >= 5)) break;
  }
  const ranked = Object.entries(candidates).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < 0) return { email: null, confidence: null };
  const [best, score] = ranked[0];
  return { email: best, confidence: score >= 5 ? "high" : "low" };
}
