import type { Paper } from "./types";

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

// The applicant's background, woven into every email. Override with the
// STUDENT_BACKGROUND env var without touching code.
const STUDENT_BACKGROUND =
  process.env.STUDENT_BACKGROUND ||
  'As co-author of "NeuroClip: A Deep Learning Enabled Context-Aware Multimodal System for Video Retrieval and Compression" (submitted to IBCAST 2026), I worked on aligning video content with text-based queries for retrieval.';

const SYSTEM =
  "You write concise, specific, personal academic outreach for a prospective " +
  "graduate student. Never invent papers, facts, or results — use only the papers " +
  "provided. Match the requested paragraph structure and tone exactly. Return only JSON.";

// Few-shot examples that define the target style: professor-specific, references
// ONE concrete recent paper, and connects it to the applicant's own work.
const STYLE_EXAMPLES = `Example A:
I have been following your lab's work combining computer vision with natural language, and your recent work on mitigating temporal hallucination in video understanding with multimodal large language models was especially interesting to me, because understanding video content together with language is closely connected to what I have been working on. As co-author of "NeuroClip: A Deep Learning Enabled Context-Aware Multimodal System for Video Retrieval and Compression" (submitted to IBCAST 2026), I worked on aligning video content with text-based queries for retrieval, so your group's direction in vision and language is exactly the area I would like to pursue in more depth under your guidance.

Example B:
I have been following your lab's work on cross-modal and composed video retrieval, and your recent work on automatically constructing triplets for composed video retrieval was especially interesting to me, because retrieving a target video from a query plus a modification is very close to what I have been working on. As co-author of "NeuroClip: A Deep Learning Enabled Context-Aware Multimodal System for Video Retrieval and Compression" (submitted to IBCAST 2026), I worked on aligning video content with text-based queries for retrieval, so your group's direction in cross-modal video retrieval is exactly the area I would like to pursue in more depth under your guidance.

Example C (used when the topic is farther from the applicant's, still specific and honest):
I have been following your lab's work in physics-based computer vision and human modeling, and your recent work on neural optimization for multiview human mesh recovery was especially interesting to me, particularly the idea of framing perception as an optimization problem solved by a learned model. As co-author of "NeuroClip: A Deep Learning Enabled Context-Aware Multimodal System for Video Retrieval and Compression" (submitted to IBCAST 2026), I worked on aligning video content with text-based queries for retrieval; while that sits closer to the retrieval and multimodal side of vision, it gave me a strong foundation in deep learning for video that I would be eager to extend toward the problems your lab studies.`;

function papersBlock(papers: Paper[]): string {
  if (!papers.length) return "(none found)";
  return papers
    .slice(0, 5)
    .map((p) => {
      let s = (p.abstract || "").replace(/\s+/g, " ").trim();
      if (s.length > 320) s = s.slice(0, 320) + "…";
      return `- "${p.title}"${p.year ? ` (${p.year})` : ""} — ${s || "no abstract"}`;
    })
    .join("\n");
}

// Example-style paragraph used when the AI is unavailable.
function fallbackParagraph(topics: string, papers: Paper[]): string {
  const area = (topics.split(",")[0] || "your research area").trim();
  if (papers.length) {
    return `I have been following your lab's work on ${topics || area}, and your recent work "${papers[0].title}" was especially interesting to me, because it connects closely to what I have been working on. ${STUDENT_BACKGROUND} Your group's direction in ${area} is exactly the area I would like to pursue in more depth under your guidance.`;
  }
  return `I have been following your lab's work on ${topics || area}, which aligns closely with my research interests. ${STUDENT_BACKGROUND} Your group's direction is exactly the area I would like to pursue in more depth under your guidance.`;
}

// Robustly pull the paragraph out of the model reply. Handles ```json fences,
// stray prose, and malformed JSON, and NEVER returns raw JSON-looking text.
function extractParagraph(raw: string): string {
  let c = (raw || "").trim();
  c = c.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const p = JSON.parse(c);
    const v = String(p.paragraph || p.lines || p.text || "").trim();
    if (v) return v;
  } catch {
    /* not clean JSON — fall through */
  }
  const m = c.match(/"(?:paragraph|lines|text)"\s*:\s*"([\s\S]*?)"\s*}?\s*$/);
  if (m) return m[1].replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
  // Still looks like JSON/markdown — refuse to leak it.
  if (c.startsWith("{") || c.startsWith("```") || c.startsWith("[")) return "";
  return c;
}

async function callModel(
  model: string,
  name: string,
  university: string,
  topics: string,
  papers: Paper[],
): Promise<string> {
  const user = `Write ONE personalized paragraph for a cold email to a professor, in the exact style of the examples.

Professor: ${name}
University/Lab: ${university || "(unknown)"}
Their research area / topics: ${topics || "(unspecified)"}

Their recent papers (pick the ONE that best matches the applicant's interests and refer to it as "your recent work on ..."):
${papersBlock(papers)}

Applicant background to weave in (keep the paper title exact): ${STUDENT_BACKGROUND}

Rules:
- One paragraph, 3-4 sentences. No greeting, no sign-off, no quotes around the whole thing.
- Open with: "I have been following your lab's work on <the professor's area>, and your recent work on <ONE paper above, PARAPHRASED into a natural topic phrase — not the raw title, not in quotes> was especially interesting to me, because <a concrete reason linking it to the applicant's video / text / multimodal retrieval work>."
- Then weave in the applicant background and close by naming the professor's SPECIFIC area, e.g. "... so your group's direction in <that area> is exactly the area I would like to pursue in more depth under your guidance."
- Use ONLY the papers listed. Never invent a paper. If none are listed, describe their stated topics and omit the "your recent work on ..." clause.
- Make it clearly specific to THIS professor — not generic.

Style examples:
${STYLE_EXAMPLES}

Return ONLY JSON: {"paragraph": "<the full paragraph>"}`;

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
  const text = extractParagraph(content);
  if (!text) throw new Error("empty");
  return text;
}

export async function personalize(
  name: string,
  university: string,
  topics: string,
  papers: Paper[],
): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) return fallbackParagraph(topics, papers);
  const models = [
    process.env.OPENROUTER_MODEL_PRIMARY || "deepseek/deepseek-chat",
    process.env.OPENROUTER_MODEL_FALLBACK || "qwen/qwen-2.5-32b-instruct",
  ];
  for (const m of models) {
    try {
      return await callModel(m, name, university, topics, papers);
    } catch {
      /* try next model */
    }
  }
  return fallbackParagraph(topics, papers);
}
