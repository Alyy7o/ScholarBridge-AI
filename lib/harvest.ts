// Scrape professor emails from the FIRST PAGE of their open-access papers and
// cache them (shared, in professor_emails). One paper yields every co-author's
// email, so the cache grows fast and cheap.
import type { SupabaseClient } from "@supabase/supabase-js";
import { promises as dnsp } from "node:dns";

const OPENALEX = "https://api.openalex.org";

// Cache MX results per domain so a crawl of many same-domain emails does one lookup.
const mxCache = new Map<string, boolean>();

/** Does this domain actually accept mail? Verifies an MX record (or an A record
 *  fallback). Confirms the domain can receive email — i.e. the address isn't on
 *  a made-up/dead domain — without sending anything. Lenient on transient DNS
 *  errors so we don't drop good addresses when DNS momentarily fails. */
export async function domainHasMx(domain: string): Promise<boolean> {
  const d = (domain || "").toLowerCase().trim();
  if (!d || d.indexOf(".") < 1) return false;
  if (mxCache.has(d)) return mxCache.get(d)!;
  let ok = false;
  try {
    const mx = await dnsp.resolveMx(d);
    ok = Array.isArray(mx) && mx.length > 0;
  } catch (e) {
    const code = (e as { code?: string })?.code || "";
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "NXDOMAIN") {
      // No MX — some domains still receive mail on their A record.
      try { const a = await dnsp.resolve(d); ok = Array.isArray(a) && a.length > 0; } catch { ok = false; }
    } else {
      ok = true; // transient (timeout/servfail) — give the benefit of the doubt
    }
  }
  mxCache.set(d, ok);
  return ok;
}

/** Keep only emails whose domain can actually receive mail. */
export async function filterByMx(emails: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const e of emails) {
    if (await domainHasMx(e.split("@")[1] || "")) out.push(e);
  }
  return out;
}

// A country auto-stops (marked "done") once it has scanned this many papers, so
// one huge country can't hog the crawler forever. Tune via env.
const COUNTRY_PAPER_CAP = Number(process.env.HARVEST_COUNTRY_CAP || "60000");
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

// Common generic TLDs. Any 2-letter TLD (ccTLDs like jp, cn, uk, de) is also
// accepted. Anything else — e.g. a run-on word from broken PDF text such as
// "…herpropertiesdifficult" — is rejected as not a real domain.
const VALID_GTLDS = new Set([
  "com", "org", "net", "edu", "gov", "mil", "int", "info", "biz", "io", "ai",
  "co", "dev", "app", "eu", "asia", "name", "pro", "xyz", "online", "site", "tech",
]);

/**
 * Reject the false positives that PDF/HTML text extraction produces. A string
 * can look like an email (has an "@" and a dot) yet be junk:
 *   • run-on words with a bogus TLD  (".itslowabundanceinn@uremade…difficult")
 *   • all-digit local parts          ("15054218031@163.com", alumni/ref IDs)
 *   • malformed local/domain labels
 * Only syntactically sane, real-TLD addresses pass.
 */
export function isPlausibleEmail(email: string): boolean {
  const e = (email || "").toLowerCase().trim().replace(/\.$/, "");
  if (e.length < 6 || e.length > 254) return false;
  const at = e.indexOf("@");
  if (at < 1 || e.indexOf("@", at + 1) !== -1) return false; // exactly one "@"
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  // Local part: 1–40 chars, no leading/trailing dot, and MUST contain a letter
  // (kills all-digit locals like "140973239" which are IDs, not names).
  if (local.length > 40) return false;
  if (!/^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?$/.test(local)) return false;
  if (!/[a-z]/.test(local)) return false;
  // Domain: 2+ labels, each 1–63 of [a-z0-9-] without edge hyphens.
  if (domain.length > 200) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  for (const lab of labels) {
    if (!/^[a-z0-9-]{1,63}$/.test(lab) || lab.startsWith("-") || lab.endsWith("-")) return false;
  }
  const tld = labels[labels.length - 1];
  if (!(/^[a-z]{2}$/.test(tld) || VALID_GTLDS.has(tld))) return false;
  return true;
}

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
  // Drop role addresses AND anything that isn't a plausible real email.
  return [...out].filter((e) => !GENERIC.has(e.split("@")[0]) && isPlausibleEmail(e));
}

type OAAuthor = { id: string; name: string; institution: string; country: string; corresponding: boolean };

function authorsFromWork(w: any): OAAuthor[] {
  return (w.authorships || []).map((a: any) => {
    const inst = (a.institutions || [])[0] || {};
    return {
      id: String(a.author?.id || "").split("/").pop() || "",
      name: a.author?.display_name || "",
      institution: inst.display_name || "",
      country: inst.country_code || "",
      corresponding: !!a.is_corresponding,
    };
  }).filter((a: OAAuthor) => a.id && a.name);
}

/** Emails that appear right after a "corresponding / e-mail" cue in the text. */
function correspondenceEmails(text: string, emails: string[]): string[] {
  const lower = (text || "").toLowerCase();
  const hits: string[] = [];
  for (const e of emails) {
    const i = lower.indexOf(e.toLowerCase());
    if (i < 0) continue;
    const ctx = lower.slice(Math.max(0, i - 180), i);
    if (/correspond|e-?mail|✉|to whom|address for/.test(ctx)) hits.push(e);
  }
  return hits;
}

/** Strip accents so "Müller" matches "muller", "Nguyễn" matches "nguyen", etc. */
function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Score how well an email's local-part matches a person's name. Handles the
 *  common Western and romanized-CJK patterns: first.last, flast, lastf,
 *  firstlast, lastfirst, plus bare surname. */
function score(local: string, name: string): number {
  const l = deaccent(local).toLowerCase();
  const parts = deaccent(name).toLowerCase().replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter(Boolean);
  if (!parts.length) return 0;
  const last = parts[parts.length - 1];
  const first = parts[0];
  const fi = first ? first[0] : "";
  const li = last ? last[0] : "";
  let s = 0;
  if (last.length > 1 && l.includes(last)) s += 5;
  if (first && last) {
    const combos = [
      `${first}.${last}`, `${first}${last}`, `${last}${first}`, `${last}.${first}`,
      `${fi}${last}`, `${fi}.${last}`, `${last}${fi}`, `${last}.${fi}`,
      `${first}${li}`, `${first}.${li}`,
    ];
    if (combos.includes(l)) s += 4;
    if (last.length > 1 && (l.startsWith(last) || l.endsWith(last))) s += 1;
  }
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
      // First TWO pages — co-author emails and affiliations often sit on page 2.
      const parsed = await pdfParse(buf, { max: 2 });
      return (parsed.text || "").slice(0, 16000);
    }
    return buf.toString("utf-8").replace(/<[^>]+>/g, " ").slice(0, 16000);
  } catch {
    return "";
  }
}

type Found = { openalex_id: string; name: string; email: string; institution: string; country: string; field: string; workId: string; year: number; score: number };

/** The paper's research area, from its OpenAlex topic (subfield preferred). */
function fieldOfWork(w: any): string {
  const t = w.primary_topic || {};
  return t.subfield?.display_name || t.field?.display_name || t.display_name || "";
}

/** Harvest one work: return EVERY author (so we never lose a professor), with an
 *  email attached where we can find one on the paper's first pages. */
async function harvestWork(w: any): Promise<Found[]> {
  const authors = authorsFromWork(w);
  if (!authors.length) return [];

  // Best-effort email discovery from the paper's first two pages.
  let paired: Record<string, { email: string; score: number }> = {};
  const loc = w.best_oa_location || w.primary_location || {};
  const url = (loc.pdf_url as string) || (loc.landing_page_url as string);
  if (url) {
    const text = await pageOneText(url);
    // Extract, then keep only addresses whose domain can actually receive mail.
    const emails = text ? await filterByMx(extractEmails(text)) : [];
    if (emails.length) {
      paired = pairEmailsToAuthors(emails, authors);
      // Attribute the corresponding author's email even without a name match:
      // OpenAlex flags who is corresponding, and the page usually cues it.
      const used = new Set(Object.values(paired).map((v) => v.email));
      const corr = authors.filter((a) => a.corresponding && !paired[a.id]);
      if (corr.length) {
        // Attribute an email to a corresponding author ONLY when the page
        // explicitly cues it as the correspondence address (near "correspond",
        // "e-mail", ✉, etc.). The old behaviour of grabbing ANY leftover email
        // was the main source of wrong/garbage addresses, so it's removed:
        // better to leave a professor email-less than to store a bogus one.
        const cued = correspondenceEmails(text, emails).filter((e) => !used.has(e));
        for (let i = 0; i < corr.length && i < cued.length; i++) {
          paired[corr[i].id] = { email: cued[i], score: 3 };
          used.add(cued[i]);
        }
      }
    }
  }

  const year = Number(w.publication_year) || new Date().getFullYear();
  const wid = String(w.id || "").split("/").pop() || "";
  const field = fieldOfWork(w);
  // One record per author — email + score only when found, else blank.
  return authors.map((a) => {
    const v = paired[a.id];
    return { openalex_id: a.id, name: a.name, email: v?.email || "", institution: a.institution, country: a.country, field, workId: wid, year, score: v?.score || 0 };
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
    // Never wipe an email we already found; email-less authors are still saved.
    const email = f.email || ex?.email || "";
    const hasEmail = !!email;
    const score = f.email ? f.score : 0;
    const strong = hasEmail && (score >= 5 || seen >= 2 || lastYear >= nowYear - 4);
    return {
      openalex_id: f.openalex_id,
      name: f.name || ex?.name || "",
      email: email || null,
      domain: hasEmail ? (email.split("@")[1] || "") : "",
      institution: f.institution || ex?.institution || "",
      country: (f.country || ex?.country || "").toLowerCase(),
      field: f.field || ex?.field || "",
      source_work_ids: [...works],
      times_seen: seen,
      first_seen_year: ex?.first_seen_year || f.year,
      last_seen_year: lastYear,
      confidence: hasEmail ? (strong ? "high" : "low") : "none",
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
      select: "id,publication_year,authorships,best_oa_location,primary_location,primary_topic",
    }));
    works = data.results || [];
  } catch {
    return { email: null, confidence: null };
  }
  const all: Found[] = [];
  for (const w of works) {
    const f = await harvestWork(w);
    all.push(...f);
    if (f.some((x) => x.openalex_id === authorId && x.email)) break; // got the target's EMAIL, stop early
  }
  await storeEmails(admin, all);
  const mine = all.filter((x) => x.openalex_id === authorId && x.email).sort((a, b) => b.score - a.score)[0];
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
    select: "id,publication_year,authorships,best_oa_location,primary_location,primary_topic",
  }));
  const works = data.results || [];
  const all: Found[] = [];
  for (const w of works) all.push(...(await harvestWork(w)));
  const stored = await storeEmails(admin, all);
  // Funnel diagnostics (visible in function logs): how many authors and how many
  // of them we actually attached an email to.
  const withEmail = all.filter((f) => f.email).length;
  console.log(`[harvest] ${country}: ${works.length} papers → ${all.length} authors, ${withEmail} with email, stored ${stored}`);
  return { processed: works.length, stored, next: data.meta?.next_cursor || null };
}

/** Crawl one country's next page and persist its progress. Used by tick. */
async function advanceCountry(admin: SupabaseClient, country: string, st: any): Promise<{ country: string; processed: number; stored: number; done: boolean }> {
  const r = await crawlCountry(admin, country, st?.cursor || "*");
  const totalPapers = (st?.papers || 0) + r.processed;
  // A country stops (status "done") when it runs out of pages OR reaches the cap.
  const done = !r.next || r.processed === 0 || totalPapers >= COUNTRY_PAPER_CAP;
  await admin.from("harvest_state").upsert({
    country,
    cursor: r.next || st?.cursor || "*",
    status: done ? "done" : "running",
    papers: totalPapers,
    emails: (st?.emails || 0) + r.stored,
    updated_at: new Date().toISOString(),
  }, { onConflict: "country" });
  return { country, processed: r.processed, stored: r.stored, done };
}

/**
 * Background tick: advance ONE country by one page each call (round-robin — the
 * least-recently-crawled eligible country goes next), so a 1-minute cron rotates
 * evenly across all countries. Every non-done, non-paused country is included.
 * Intended to be called ~every minute by a cron.
 */
export async function tick(admin: SupabaseClient): Promise<{ idle?: boolean; done?: boolean; country?: string; processed?: number; stored?: number; capped?: boolean }> {
  const { data: ctrl } = await admin.from("harvest_control").select("*").eq("id", 1).maybeSingle();
  if (!ctrl?.active) return { idle: true };
  const order: string[] = ctrl.order_list || ["cn", "jp", "kr", "tw", "sg"];

  const { data: states } = await admin.from("harvest_state").select("*").in("country", order);
  const byC = new Map((states || []).map((s: any) => [s.country, s]));

  // Include every country except those that are done or paused; rotate by the
  // one waiting longest (oldest updated_at; never-crawled counts as oldest).
  const pending = order.filter((c) => {
    const s = byC.get(c)?.status || "pending";
    return s !== "done" && s !== "paused";
  });
  if (!pending.length) return { done: true };
  pending.sort((a, b) => String(byC.get(a)?.updated_at || "").localeCompare(String(byC.get(b)?.updated_at || "")));
  const next = pending[0];

  const r = await advanceCountry(admin, next, byC.get(next));
  return { country: r.country, processed: r.processed, stored: r.stored, done: r.done };
}
