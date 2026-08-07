// Professor discovery via OpenAlex (authors), plus a best-effort email lookup
// that scrapes corresponding-author emails from a professor's open-access papers
// (no scholarly API exposes emails directly).

import { isPlausibleEmail, domainHasMx } from "./harvest";

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

export type WorkItem = {
  title: string;
  year: number | null;
  venue: string;
  cited_by_count: number;
  is_oa: boolean;
  url: string | null;
};

/** A professor's most recent papers (for the details view). */
export async function authorWorks(openalexId: string, limit = 6): Promise<WorkItem[]> {
  const id = (openalexId || "").trim();
  if (!id) return [];
  const data = await oaJson(oaUrl("/works", {
    filter: `authorships.author.id:${id}`,
    sort: "publication_date:desc",
    per_page: String(Math.min(Math.max(limit, 1), 25)),
    select: "title,publication_year,primary_location,cited_by_count,open_access,doi,id",
  }));
  return (data.results || []).map((w: any): WorkItem => {
    const loc = w.primary_location || {};
    const src = loc.source || {};
    return {
      title: w.title || "Untitled",
      year: w.publication_year || null,
      venue: src.display_name || "",
      cited_by_count: w.cited_by_count || 0,
      is_oa: !!(w.open_access && w.open_access.is_oa),
      url: w.doi || loc.landing_page_url || (w.id ? String(w.id) : null),
    };
  });
}

/** Autocomplete institutions or research fields (topics) for the filter UI. */
export async function autocomplete(
  type: "institutions" | "concepts",
  q: string,
): Promise<AutocompleteItem[]> {
  if (!q.trim()) return [];
  // "concepts" is deprecated in OpenAlex; research fields now come from topics.
  const path = type === "concepts" ? "topics" : type;
  const data = await oaJson(oaUrl(`/autocomplete/${path}`, { q }));
  return (data.results || []).slice(0, 8).map((r: any) => ({
    id: String(r.id || "").split("/").pop() || "",
    label: r.display_name || "",
    hint: r.hint || "",
  }));
}

/** Top universities in a country (for the country -> university dropdown). */
export async function listCountryInstitutions(country: string): Promise<AutocompleteItem[]> {
  const cc = (country || "").toLowerCase();
  if (!cc) return [];
  const data = await oaJson(
    oaUrl("/institutions", {
      filter: `country_code:${cc},type:education`,
      sort: "works_count:desc",
      per_page: "200",
      select: "id,display_name",
    }),
  );
  return (data.results || [])
    .map((r: any) => ({ id: String(r.id || "").split("/").pop() || "", label: r.display_name || "" }))
    .filter((x: AutocompleteItem) => x.id && x.label);
}

export type SearchFilters = {
  country?: string;        // ISO code, e.g. "US"
  institutionId?: string;  // OpenAlex institution id (e.g. "I27837315")
  conceptId?: string;      // single OpenAlex concept id (legacy)
  conceptIds?: string[];   // specific topics (narrow, OR-combined)
  subfieldIds?: string[];  // broad areas (OpenAlex subfields, OR-combined)
  query?: string;          // free-text name/keyword
  page?: number;
  perPage?: number;
};

/** Resolve a field name (e.g. "Artificial Intelligence") to its OpenAlex
 *  SUBFIELD — the wide bucket that holds all the related topics. We search the
 *  subfield vocabulary BY NAME (not the topic index), so "Artificial
 *  Intelligence" maps to the AI subfield itself instead of some arbitrary
 *  top-ranked topic whose subfield could be unrelated. */
export async function resolveSubfield(term: string): Promise<{ id: string; label: string } | null> {
  const q = term.trim();
  if (!q) return null;
  try {
    const data = await oaJson(oaUrl("/subfields", { filter: `display_name.search:${q}`, per_page: "1", select: "id,display_name" }));
    const sf = (data.results || [])[0];
    if (sf?.id) return { id: String(sf.id).split("/").pop() || "", label: sf.display_name || q };
  } catch { /* fall through */ }
  return null;
}

function toHits(arr: any[]): AuthorHit[] {
  return (arr || []).map((a: any): AuthorHit => {
    const inst = (a.last_known_institutions || [])[0] || a.last_known_institution || {};
    return {
      openalex_id: String(a.id || "").split("/").pop() || "",
      name: a.display_name || "",
      orcid: a.orcid ? String(a.orcid).split("/").pop() || a.orcid : null,
      institution: inst.display_name || "",
      country: inst.country_code || "",
      topics: ((a.topics && a.topics.length ? a.topics : a.x_concepts) || []).slice(0, 5).map((c: any) => c.display_name).filter(Boolean).join(", "),
      works_count: a.works_count || 0,
      cited_by_count: a.cited_by_count || 0,
    };
  });
}

/** OpenAlex subfield IDs from an author's topic list (short form, e.g. "1702"). */
function authorSubfieldIds(author: any): string[] {
  const topics = author?.topics || [];
  const ids: string[] = [];
  for (const t of topics) {
    const sid = String(t?.subfield?.id || "").split("/").pop();
    if (sid) ids.push(sid);
  }
  return ids;
}

/** Keep authors whose own topics overlap the selected subfield(s). */
function filterAuthorsBySubfield(authors: any[], subfieldIds: string[]): any[] {
  if (!subfieldIds.length) return authors;
  const want = new Set(subfieldIds.map((id) => String(id).split("/").pop()).filter(Boolean));
  return (authors || []).filter((a) => {
    const theirs = authorSubfieldIds(a);
    // No topic data → keep (don't over-filter incomplete profiles)
    if (!theirs.length) return true;
    return theirs.some((id) => want.has(id));
  });
}

/** Search professors/researchers by country, university and field. */
export async function searchAuthors(f: SearchFilters): Promise<{ results: AuthorHit[]; total: number; debug: { filter: string; search: string } }> {
  const conceptIds = (f.conceptIds && f.conceptIds.length ? f.conceptIds : f.conceptId ? [f.conceptId] : []).filter(Boolean);
  const subfieldIds = (f.subfieldIds || []).filter(Boolean);
  const country = (f.country || "").toLowerCase();

  // When a university and/or field is chosen, resolve people via the WORKS index
  // (works are reliably tagged with institution AND topic) then pull the distinct
  // authors. Filtering authors directly on topics.id is too sparse — a professor
  // at a small school on a niche topic often has no matching author-level topic,
  // so the intersection comes back empty even though their papers match.
  if (f.institutionId || conceptIds.length || subfieldIds.length) {
    const wf: string[] = [];
    if (f.institutionId) wf.push(`authorships.institutions.id:${f.institutionId}`);
    else if (country) wf.push(`authorships.institutions.country_code:${country}`);
    if (conceptIds.length) wf.push(`topics.id:${conceptIds.join("|")}`);
    // Broad areas filter on the paper's primary-topic SUBFIELD (wide bucket).
    if (subfieldIds.length) wf.push(`primary_topic.subfield.id:${subfieldIds.join("|")}`);
    // Only recent papers, so results are people CURRENTLY at the institution
    // rather than alumni who published there years ago and have since moved.
    const since = new Date();
    since.setFullYear(since.getFullYear() - 5);
    wf.push(`from_publication_date:${since.toISOString().slice(0, 10)}`);
    const wparams: Record<string, string> = {
      filter: wf.join(","),
      sort: "cited_by_count:desc",
      per_page: "120",
      select: "authorships,cited_by_count",
    };
    if (f.query && f.query.trim()) wparams.search = f.query.trim();
    const works = await oaJson(oaUrl("/works", wparams));
    const ids: string[] = [];
    const seen = new Set<string>();
    // Remember the institution that actually MATCHED the filter for each author,
    // so the row shows that university/country (not their possibly-different
    // current last-known institution).
    const matched: Record<string, { institution: string; country: string }> = {};
    for (const w of works.results || []) {
      for (const au of w.authorships || []) {
        const insts = au.institutions || [];
        const hit = f.institutionId
          ? insts.find((i: any) => String(i.id || "").split("/").pop() === f.institutionId)
          : country
            ? insts.find((i: any) => String(i.country_code || "").toLowerCase() === country)
            : insts[0];
        if (!hit) continue;
        const aid = String(au.author?.id || "").split("/").pop() || "";
        if (!aid || seen.has(aid)) continue;
        seen.add(aid);
        ids.push(aid);
        matched[aid] = { institution: hit.display_name || "", country: hit.country_code || "" };
      }
      if (ids.length >= 50) break;
    }
    if (!ids.length) return { results: [], total: 0, debug: { filter: wparams.filter, search: wparams.search || "" } };
    const ad = await oaJson(oaUrl("/authors", {
      filter: `ids.openalex:${ids.slice(0, 50).join("|")}`,
      per_page: "50",
      select: "id,display_name,orcid,last_known_institutions,topics,works_count,cited_by_count",
    }));
    // Drop faculty whose own topic subfields never overlap the selected area
    // (e.g. bio primary who only coauthored one AI-tagged paper).
    const authorRows = filterAuthorsBySubfield(ad.results || [], subfieldIds);
    const results = toHits(authorRows)
      .map((h) => {
        const m = matched[h.openalex_id];
        return m ? { ...h, institution: m.institution || h.institution, country: m.country || h.country } : h;
      })
      .sort((a, b) => b.cited_by_count - a.cited_by_count);
    return { results, total: results.length, debug: { filter: wparams.filter, search: wparams.search || "" } };
  }

  // Country-only and/or name search: the authors index handles this well.
  const params: Record<string, string> = {
    sort: "cited_by_count:desc",
    per_page: String(Math.min(f.perPage || 25, 50)),
    page: String(f.page || 1),
  };
  const filters: string[] = [];
  if (country) filters.push(`last_known_institutions.country_code:${country}`);
  if (filters.length) params.filter = filters.join(",");
  if (f.query && f.query.trim()) params.search = f.query.trim();
  if (!params.filter && !params.search) return { results: [], total: 0, debug: { filter: "", search: "" } };
  const data = await oaJson(oaUrl("/authors", params));
  const results = toHits(data.results || []);
  return { results, total: data.meta?.count || results.length, debug: { filter: params.filter || "", search: params.search || "" } };
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
      if (!isPlausibleEmail(email)) continue; // skip PDF-extraction junk
      candidates[email] = Math.max(candidates[email] ?? -99, scoreEmail(email, name));
    }
    // Stop early once we have a strong match.
    if (Object.values(candidates).some((v) => v >= 5)) break;
  }
  const ranked = Object.entries(candidates).sort((a, b) => b[1] - a[1]);
  // Return the best-scoring candidate whose domain can actually receive mail.
  for (const [best, score] of ranked) {
    if (score < 0) break;
    if (await domainHasMx(best.split("@")[1] || "")) {
      return { email: best, confidence: score >= 5 ? "high" : "low" };
    }
  }
  return { email: null, confidence: null };
}
