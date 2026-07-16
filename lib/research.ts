import type { Paper } from "./types";

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

async function openalex(name: string, university: string, limit: number): Promise<Paper[]> {
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
  const w = await j(`${OPENALEX}/works?filter=authorships.author.id:${id}&sort=publication_date:desc&per_page=${limit}&mailto=${mailto}`);
  return (w.results || [])
    .map((x: any): Paper => ({
      title: (x.title || x.display_name || "").trim(),
      year: x.publication_year,
      abstract: reconstructAbstract(x.abstract_inverted_index),
      source: "openalex",
    }))
    .filter((p: Paper) => p.title);
}

async function semanticScholar(name: string, limit: number): Promise<Paper[]> {
  const s = await j(`${SEMANTIC}/author/search?query=${encodeURIComponent(name)}&fields=name,paperCount&limit=5`);
  const id = (s.data || [])[0]?.authorId;
  if (!id) return [];
  const p = await j(`${SEMANTIC}/author/${id}/papers?fields=title,abstract,year&limit=${limit}`);
  return (p.data || [])
    .map((x: any): Paper => ({
      title: (x.title || "").trim(),
      year: x.year,
      abstract: (x.abstract || "").slice(0, 1200),
      source: "semantic_scholar",
    }))
    .filter((x: Paper) => x.title)
    .sort((a: Paper, b: Paper) => (b.year || 0) - (a.year || 0))
    .slice(0, limit);
}

export async function findPapers(
  name: string,
  university = "",
  limit = 4,
): Promise<{ papers: Paper[]; source: string }> {
  try {
    const papers = await openalex(name, university, limit);
    if (papers.length) return { papers, source: "openalex" };
  } catch { /* fall through */ }
  try {
    const papers = await semanticScholar(name, limit);
    if (papers.length) return { papers, source: "semantic_scholar" };
  } catch { /* fall through */ }
  return { papers: [], source: "none" };
}
