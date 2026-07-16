import type { Paper } from "./types";

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM =
  "You write concise, specific academic outreach for a prospective graduate " +
  "student. You never invent papers or facts. Output must be valid JSON.";

function papersBlock(papers: Paper[]): string {
  if (!papers.length) return "(none found)";
  return papers
    .slice(0, 4)
    .map((p) => {
      let s = (p.abstract || "").replace(/\s+/g, " ").trim();
      if (s.length > 280) s = s.slice(0, 280) + "…";
      return `- "${p.title}"${p.year ? ` (${p.year})` : ""} — ${s || "no abstract"}`;
    })
    .join("\n");
}

function fallbackLines(topics: string, papers: Paper[]): string {
  const first = (topics.split(",")[0] || "your research area").trim();
  if (papers.length) {
    return `I recently read your paper "${papers[0].title}", and I was especially drawn to how it approaches ${first}. This direction closely matches the questions I hope to pursue in graduate study, and I would be excited to contribute to this line of work.`;
  }
  return `Your work on ${topics || first} strongly aligns with my research interests, and I have been following developments in this area closely. I would welcome the opportunity to contribute to your group's work.`;
}

async function callModel(model: string, name: string, university: string, topics: string, papers: Paper[]): Promise<string> {
  const user = `Professor: ${name}
University/Lab: ${university || "(unknown)"}
Their research topics: ${topics || "(unspecified)"}

Recent papers (title — abstract snippet):
${papersBlock(papers)}

Write EXACTLY 2-3 sentences (no greeting, no sign-off) showing genuine familiarity with ONE specific paper or idea above, connected to the student's interest in ${topics}. Be specific. Do not mention papers not listed. If none are listed, write 2 sentences about the stated topics generally.

Return ONLY JSON: {"lines": "<the 2-3 sentences>"}`;

  const r = await fetch(OPENROUTER, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://scholarbridge.ai",
      "X-Title": "ScholarBridge AI",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(content);
    const lines = String(parsed.lines || "").trim();
    if (lines) return lines;
  } catch { /* not json */ }
  const trimmed = content.trim();
  if (!trimmed) throw new Error("empty");
  return trimmed;
}

export async function personalize(name: string, university: string, topics: string, papers: Paper[]): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) return fallbackLines(topics, papers);
  const models = [
    process.env.OPENROUTER_MODEL_PRIMARY || "deepseek/deepseek-chat",
    process.env.OPENROUTER_MODEL_FALLBACK || "qwen/qwen-2.5-32b-instruct",
  ];
  for (const m of models) {
    try {
      return await callModel(m, name, university, topics, papers);
    } catch { /* try next */ }
  }
  return fallbackLines(topics, papers);
}
