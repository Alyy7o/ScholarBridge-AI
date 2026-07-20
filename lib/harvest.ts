// Scrape professor emails from the FIRST PAGE of their open-access papers and
// cache them (shared, in professor_emails). One paper yields every co-author's
// email, so the cache grows fast and cheap.
import type { SupabaseClient } from "@supabase/supabase-js";

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
  if (!r.ok) throw new Error(`OpenAlex ${r.status}`);
  return r.json();
}

const GENERIC = new Set([
  "info", "admin", "support", "editor", "editorial", "journal", "journals",
  "corresponding", "contact", "webmaster", "office", "secretary", "noreply",
  "no-reply", "press", "sales", "help", "service", "publications", "media",
]);
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Extract emails from page-1 text, expanding "{a, b}@domain" group syntax. */
export function extractEmails(text: string): string[] {
  const out = new Set<string>();
  let t = text || "";
  // light de-obfuscation: "name (at) uni (dot) edu"
  t = t.replace(/([A-Za-z0-9._%+-]+)\s*[([{]?\s*at\s*[)\]}]?\s*([A-Za-z0-9.-]+)\s*[([{]?\s*dot\s*[)\]}]?\s*([A-Za-z]{2,})/gi, "$1@$2.$3");
  // group syntax: {jsmith, tk}@ee.uni.edu -> jsmith@..., tk@...
  const grp = /\{([^}]{1,120})\}\s*@\s*([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  let m: RegExpExecArray | null;
  while ((m = grp.exec(t))) {
    const domain = m[2];
    for (const local of m[1].split(/[,;/|]/).map((x) => x.trim()).filter(Boolean)) {
      if (/^[A-Za-z0-9._%+-]+$/.test(local)) out.add(`${local}@${domain}`.toLowerCase());
    }
  }
  for (const raw of t.match(EMAIL_RE) || []) out.add(raw.toLowerCase().replace(/\.$/, ""));
  return [...out].filter((e) => !GENERIC.has(e.split("@")[0]));
}

type OAAuthor = { id: string; name: string; institution: string; country: string };

function authorsFromWork(w: any): OAAuthor[] {
  return (w.authorships || []).map((a: any) => {
    const inst = (a.institutions || [])[0] || {};
    return {
      id: String(a.author?.id || "").split("/").pop() || "",
      name: a.author?.display_name || "",
      institution: inst.display_name || "",
      country: inst.country_code || "",
    };
  }).filter((a: OAAuthor) => a.id && a.name);
}

/** Score how well an email's local-part matches a person's name. */
function score(local: string, name: string): number {
  const l = local.toLowerCase();
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!parts.length) return 0;
  const last = parts[parts.length - 1];
  const first = parts[0];
  let s = 0;
  if (last.length > 1 && l.includes(last)) s += 5;
  if (first && last && (l === `${first}.${last}` || l === `${first}${last}` || l === `${first[0]}${last}` || l === `${first[0]}.${last}`)) s += 4;
  if (first && first.length > 1 && l.includes(first)) s += 2;
  return s;
}

/** Pair page-1 emails to the paper's known authors (best match, one-to-one). */
export function pairEmailsToAuthors(emails: string[], authors: OAAuthor[]): Record<string, { email: string; score: number }> {
  const pairs: { aid: string; email: string; s: number }[] = [];
  for (const a of authors) for (const e of emails) {
    const s = score(e.split("@")[0], a.name);
    if (s > 0) pairs.push({ aid: a.id, email: e, s });
  }
  pairs.sort((x, y) => y.s - x.s);
  const chosen: Record<string, { email: string; score: number }> = {};
  const usedEmail = new Set<string>();
  for (const p of pairs) {
    if (chosen[p.aid] || usedEmail.has(p.email)) continue;
    chosen[p.aid] = { email: p.email, score: p.s };
    usedEmail.add(p.email);
  }
  return chosen;
}

async function pageOneText(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, { headers: { "User-Agent": "ScholarBridgeAI/0.1" }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return "";
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 20 * 1024 * 1024) return ""; // skip huge files
    if ((r.headers.get("content-type") || "").includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const parsed = await pdfParse(buf, { max: 1 }); // FIRST PAGE ONLY
      return (parsed.text || "").slice(0, 8000);
    }
    return buf.toString("utf-8").replace(/<[^>]+>/g, " ").slice(0, 8000);
  } catch {
    return "";
  }
}

type Found = { openalex_id: string; name: string; email: string; institution: string; country: string; workId: string; year: number; score: number };

/** Harvest emails from one work's first page, paired to its authors. */
async function harvestWork(w: any): Promise<Found[]> {
  const loc = w.best_oa_location || w.primary_location || {};
  const url = (loc.pdf_url as string) || (loc.landing_page_url as string);
  if (!url) return [];
  const text = await pageOneText(url);
  if (!text) return [];
  const emails = extractEmails(text);
  if (!emails.length) return [];
  const authors = authorsFromWork(w);
  const paired = pairEmailsToAuthors(emails, authors);
  const year = Number(w.publication_year) || new Date().getFullYear();
  const wid = String(w.id || "").split("/").pop() || "";
  return Object.entries(paired).map(([aid, v]) => {
    const a = authors.find((x) => x.id === aid)!;
    return { openalex_id: aid, name: a.name, email: v.email, institution: a.institution, country: a.country, workId: wid, year, score: v.score };
  });
}

/** Upsert found emails into the shared cache, merging with existing rows. */
export async function storeEmails(admin: SupabaseClient, found: Found[]): Promise<number> {
  if (!found.length) return 0;
  const byId = new Map<string, Found>();
  for (const f of found) { const cur = byId.get(f.openalex_id); if (!cur || f.score > cur.score) byId.set(f.openalex_id, f); }
  const ids = [...byId.keys()];
  const { data: existing } = await admin.from("professor_emails").select("*").in("openalex_id", ids);
  const exMap = new Map((existing || []).map((r: any) => [r.openalex_id, r]));
  const nowYear = new Date().getFullYear();
  const rows = [...byId.values()].map((f) => {
    const ex: any = exMap.get(f.openalex_id);
    const works = new Set<string>([...(ex?.source_work_ids || []), f.workId]);
    const seen = works.size;
    const lastYear = Math.max(ex?.last_seen_year || 0, f.year);
    const strong = f.score >= 5 || seen >= 2 || lastYear >= nowYear - 4;
    return {
      openalex_id: f.openalex_id,
      name: f.name || ex?.name || "",
      email: f.email,
      domain: f.email.split("@")[1] || "",
      institution: f.institution || ex?.institution || "",
      country: (f.country || ex?.country || "").toLowerCase(),
      source_work_ids: [...works],
      times_seen: seen,
      first_seen_year: ex?.first_seen_year || f.year,
      last_seen_year: lastYear,
      confidence: strong ? "high" : "low",
      updated_at: new Date().toISOString(),
    };
  });
  const { error } = await admin.from("professor_emails").upsert(rows, { onConflict: "openalex_id" });
  return error ? 0 : rows.length;
}

/** Cache lookup for one author. */
export async function getCachedEmail(admin: SupabaseClient, openalexId: string): Promise<{ email: string; confidence: string } | null> {
  const { data } = await admin.from("professor_emails").select("email,confidence").eq("openalex_id", openalexId).maybeSingle();
  return data?.email ? { email: data.email, confidence: data.confidence } : null;
}

/** On-demand: harvest a professor's recent OA papers, store everyone found, return theirs. */
export async function harvestForAuthor(admin: SupabaseClient, authorId: string, name: string): Promise<{ email: string | null; confidence: string | null }> {
  const cached = await getCachedEmail(admin, authorId);
  if (cached) return cached;
  let works: any[] = [];
  try {
    const data = await oaJson(oaUrl("/works", {
      filter: `authorships.author.id:${authorId},open_access.is_oa:true`,
      sort: "publication_date:desc",
      per_page: "6",
      select: "id,publication_year,authorships,best_oa_location,primary_location",
    }));
    works = data.results || [];
  } catch {
    return { email: null, confidence: null };
  }
  const all: Found[] = [];
  for (const w of works) {
    const f = await harvestWork(w);
    all.push(...f);
    if (f.some((x) => x.openalex_id === authorId)) break; // got the target, stop early
  }
  await storeEmails(admin, all);
  const mine = all.filter((x) => x.openalex_id === authorId).sort((a, b) => b.score - a.score)[0];
  if (mine) return { email: mine.email, confidence: mine.score >= 5 ? "high" : "low" };
  return { email: null, confidence: null };
}

/** Batch crawler: harvest a page of recent OA works from a country. */
export async function crawlCountry(admin: SupabaseClient, country: string, cursor: string): Promise<{ processed: number; stored: number; next: string | null }> {
  const since = new Date(); since.setFullYear(since.getFullYear() - 5);
  const data = await oaJson(oaUrl("/works", {
    filter: `authorships.institutions.country_code:${country.toLowerCase()},open_access.is_oa:true,from_publication_date:${since.toISOString().slice(0, 10)}`,
    sort: "cited_by_count:desc",
    per_page: "15",
    cursor: cursor || "*",
    select: "id,publication_year,authorships,best_oa_location,primary_location",
  }));
  const works = data.results || [];
  const all: Found[] = [];
  for (const w of works) all.push(...(await harvestWork(w)));
  const stored = await storeEmails(admin, all);
  return { processed: works.length, stored, next: data.meta?.next_cursor || null };
}

/**
 * Background tick: advance the active crawl by one page. Picks the first country
 * in the control order that isn't done, crawls a page from its saved cursor, and
 * persists progress. Intended to be called ~every minute by a cron.
 */
export async function tick(admin: SupabaseClient): Promise<{ idle?: boolean; done?: boolean; country?: string; processed?: number; stored?: number }> {
  const { data: ctrl } = await admin.from("harvest_control").select("*").eq("id", 1).maybeSingle();
  if (!ctrl?.active) return { idle: true };
  const order: string[] = ctrl.order_list || ["cn", "jp", "kr", "tw", "sg"];

  const { data: states } = await admin.from("harvest_state").select("*").in("country", order);
  const byC = new Map((states || []).map((s: any) => [s.country, s]));
  const next = order.find((c) => (byC.get(c)?.status || "pending") !== "done");
  if (!next) return { done: true };

  const st: any = byC.get(next) || { country: next, cursor: "*", papers: 0, emails: 0 };
  const r = await crawlCountry(admin, next, st.cursor || "*");
  const done = !r.next || r.processed === 0;
  await admin.from("harvest_state").upsert({
    country: next,
    cursor: r.next || st.cursor || "*",
    status: done ? "done" : "running",
    papers: (st.papers || 0) + r.processed,
    emails: (st.emails || 0) + r.stored,
    updated_at: new Date().toISOString(),
  }, { onConflict: "country" });
  return { country: next, processed: r.processed, stored: r.stored, done };
}
