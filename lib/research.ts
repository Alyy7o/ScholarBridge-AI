import type { Paper } from "./types";
import { stripHtml } from "./text";

const OPENALEX = "https://api.openalex.org";
const SEMANTIC = "https://api.semanticscholar.org/graph/v1";

function reconstructAbstract(inv: Record<string, number[]> | null | undefined): string {
  if (!inv) return "";
  const pos: Record<number, string> = {};
  for (const [word, idxs] of Object.entries(inv)) for (const i of idxs) pos[i] = word;
  return Object.keys(pos)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => pos[i])
    .join(" ")
    .slice(0, 1200);
}

async function j(url: string): Promise<any> {
  const r = await fetch(url, { headers: { "User-Agent": "ScholarBridgeAI/0.1" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function normTitle(t: string): string {
  return String(t || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type FindPapersOpts = {
  excludeTitles?: string[];
  page?: number;
  fetchLimit?: number;
};

async function openalex(
  name: string,
  university: string,
  limit: number,
  topics = "",
  opts: FindPapersOpts = {},
): Promise<Paper[]> {
  const mailto = process.env.OPENALEX_MAILTO || "you@example.com";
  const a = await j(`${OPENALEX}/authors?search=${encodeURIComponent(name)}&per_page=10&mailto=${mailto}`);
  const authors = a.results || [];
  if (!authors.length) return [];
  const uni = university.toLowerCase().trim();
  let chosen = authors[0];
  if (uni) {
    for (const au of authors) {
      const insts = [...(au.last_known_institutions || []), au.last_known_institution].filter(Boolean);
      const names = insts.map((i: any) => (i?.display_name || "")).join(" ").toLowerCase();
      if (uni.split(" ").some((t) => t.length > 3 && names.includes(t))) { chosen = au; break; }
    }
  }
  const id = (chosen.id || "").split("/").pop();
  if (!id) return [];

  const fetchLimit = Math.max(limit, opts.fetchLimit || limit);
  const page = Math.max(1, opts.page || 1);
  const base = `${OPENALEX}/works?filter=authorships.author.id:${id}&per_page=${fetchLimit}&page=${page}&mailto=${mailto}`;
  const toPapers = (arr: any[]): Paper[] =>
    (arr || [])
      .map((x: any): Paper => ({
        title: stripHtml(x.title || x.display_name || ""),
        year: x.publication_year,
        abstract: stripHtml(reconstructAbstract(x.abstract_inverted_index)),
        source: "openalex",
      }))
      .filter((p: Paper) => p.title);

  const exclude = new Set((opts.excludeTitles || []).map(normTitle).filter(Boolean));
  const filterExcluded = (papers: Paper[]) =>
    exclude.size ? papers.filter((p) => !exclude.has(normTitle(p.title))) : papers;

  // If topics are given, search the author's works for those topics first;
  // otherwise (or if nothing matches) fall back to their most recent works.
  const topic = (topics || "").trim();
  if (topic) {
    const wt = await j(`${base}&search=${encodeURIComponent(topic)}`);
    const matched = filterExcluded(toPapers(wt.results || [])).slice(0, limit);
    if (matched.length) return matched;
  }
  const w = await j(`${base}&sort=publication_date:desc`);
  return filterExcluded(toPapers(w.results || [])).slice(0, limit);
}

async function semanticScholar(
  name: string,
  limit: number,
  opts: FindPapersOpts = {},
): Promise<Paper[]> {
  const fetchLimit = Math.max(limit, opts.fetchLimit || limit);
  const s = await j(`${SEMANTIC}/author/search?query=${encodeURIComponent(name)}&fields=name,paperCount&limit=5`);
  const id = (s.data || [])[0]?.authorId;
  if (!id) return [];
  const p = await j(`${SEMANTIC}/author/${id}/papers?fields=title,abstract,year&limit=${fetchLimit}`);
  const exclude = new Set((opts.excludeTitles || []).map(normTitle).filter(Boolean));
  return (p.data || [])
    .map((x: any): Paper => ({
      title: stripHtml(x.title || ""),
      year: x.year,
      abstract: stripHtml((x.abstract || "").slice(0, 1200)),
      source: "semantic_scholar",
    }))
    .filter((x: Paper) => x.title)
    .filter((x: Paper) => !exclude.size || !exclude.has(normTitle(x.title)))
    .sort((a: Paper, b: Paper) => (b.year || 0) - (a.year || 0))
    .slice(0, limit);
}

export async function findPapers(
  name: string,
  university = "",
  limit = 4,
  topics = "",
  opts: FindPapersOpts = {},
): Promise<{ papers: Paper[]; source: string }> {
  try {
    const papers = await openalex(name, university, limit, topics, opts);
    if (papers.length) return { papers, source: "openalex" };
  } catch { /* fall through */ }
  try {
    const papers = await semanticScholar(name, limit, opts);
    if (papers.length) return { papers, source: "semantic_scholar" };
  } catch { /* fall through */ }
  return { papers: [], source: "none" };
}
