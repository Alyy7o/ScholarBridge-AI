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

// Tone/length steering for the paragraph (from the Compose UI). These are
// deliberately distinct so the output clearly changes with the selected tone.
const TONE_INSTRUCTIONS: Record<string, string> = {
  short: "LENGTH: very brief — exactly 2 crisp sentences, no more.",
  long: "LENGTH: a fuller paragraph of 5-6 sentences with a little more specific detail.",
  warm: "VOICE: warm and enthusiastic — convey genuine excitement about their work, personable but not gushing.",
  friendly: "VOICE: friendly and approachable — relaxed, personable phrasing while staying respectful.",
  polite: "VOICE: highly polite and deferential — courteous, formal phrasing (e.g. 'I would be most grateful', 'if you would kindly').",
  professional: "VOICE: formal and professional — precise, measured, businesslike, no casual phrasing.",
  default: "",
};

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

// The professor's PRIMARY area as ONE short phrase (never the whole topic list).
function firstArea(topics: string): string {
  const t = (topics || "").split(/[,;]/)[0].trim();
  return t || "your research area";
}

// Example-style paragraph used when the AI is unavailable. Uses a single area
// (not the full comma-joined topic list) so it reads cleanly.
function fallbackParagraph(topics: string, papers: Paper[]): string {
  const area = firstArea(topics);
  if (papers.length) {
    return `I have been following your lab's work on ${area}, and I found your recent paper "${papers[0].title}" especially compelling. ${STUDENT_BACKGROUND} I would be grateful for the opportunity to explore ${area} in more depth under your guidance.`;
  }
  return `I have been following your lab's work on ${area}, which closely aligns with my own research interests. ${STUDENT_BACKGROUND} I would be grateful for the opportunity to explore this direction in more depth under your guidance.`;
}

// Subject fragment used when the AI is unavailable — one concise area, no list.
function fallbackSubject(topics: string, _papers: Paper[]): string {
  return `inspired by your work on ${firstArea(topics).toLowerCase()}`;
}

// Tidy the model's subject fragment: drop any "Prospective Research Student -"
// the model repeated, leading dashes, and trailing punctuation.
function cleanSubjectLine(s: string): string {
  let x = (s || "").trim();
  x = x.replace(/^prospective research student\s*[-–—:]\s*/i, "");
  x = x.replace(/^[-–—:\s]+/, "");
  x = x.replace(/[.\s"']+$/, "");
  return x.trim();
}

// Robustly pull the paragraph AND subject fragment out of the model reply.
// Handles ```json fences, stray prose, and malformed JSON.
function extractResult(raw: string): { paragraph: string; subjectLine: string } {
  let c = (raw || "").trim();
  c = c.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let paragraph = "";
  let subjectLine = "";
  try {
    const p = JSON.parse(c);
    paragraph = String(p.paragraph || p.lines || p.text || "").trim();
    subjectLine = String(p.subject_line || p.subjectLine || p.subject || "").trim();
  } catch {
    const m = c.match(/"(?:paragraph|lines|text)"\s*:\s*"([\s\S]*?)"/);
    if (m) paragraph = m[1].replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
    const s = c.match(/"subject_line"\s*:\s*"([\s\S]*?)"/);
    if (s) subjectLine = s[1].replace(/\\"/g, '"').replace(/\s+/g, " ").trim();
  }
  // Never leak raw JSON/markdown as the paragraph.
  if (paragraph && (paragraph.startsWith("{") || paragraph.startsWith("```") || paragraph.startsWith("["))) paragraph = "";
  return { paragraph, subjectLine };
}

async function callModel(
  model: string,
  name: string,
  university: string,
  topics: string,
  papers: Paper[],
  interest: string,
  tone: string,
): Promise<{ paragraph: string; subjectLine: string }> {
  const toneLine = TONE_INSTRUCTIONS[tone] || "";
  const user = `Write ONE personalized paragraph AND one short subject-line fragment for a cold email to a professor, in the exact style of the examples.

Professor: ${name}
University/Lab: ${university || "(unknown)"}
Their research area / topics: ${topics || "(unspecified)"}
Applicant's field / interests (use to judge how strongly a paper matches): ${interest || topics || "(unspecified)"}

Their recent papers (pick the ONE that best matches the applicant's interests and refer to it as "your recent work on ..."):
${papersBlock(papers)}

Applicant background to weave in (keep the paper title exact): ${STUDENT_BACKGROUND}

PARAGRAPH rules:
- One flowing paragraph, 3-4 sentences (unless the tone note below says otherwise). No greeting, no sign-off, no quotes around the whole thing.${toneLine ? `\n- ${toneLine}` : ""}
- CRITICAL — refer to the professor's area as ONE short, natural phrase of about 2-4 words (e.g. "video retrieval", "human pose estimation"). Do NOT paste their full topic list, do NOT enumerate several topics, and do NOT chain items with repeated "and"/commas. Pick the single most relevant area.
- Vary your sentence structure and word choice; avoid using "and" more than once per sentence.
- Open naturally, e.g.: "I have been following your lab's work on <that ONE area>, and your recent work on <ONE paper above, paraphrased into a natural topic phrase — not the raw title, not in quotes> stood out to me because <a concrete reason it connects to the applicant's video/text/multimodal retrieval work>."
- Then weave in the applicant background and close by pointing to that same specific area.
- Use ONLY the papers listed. Never invent a paper. If none are listed, describe their single main area and omit the "your recent work on ..." clause.

SUBJECT-LINE rules — a short fragment that will appear right after "Prospective Research Student - ":
- If ONE paper is a STRONG match to the applicant's interests, write: inspired by your work on <plain 3-6 word description of that paper's topic> (<a short 1-4 word name or acronym of that paper's method/model taken from its title>)
    e.g. "inspired by your work on learning movement representations from video (Action Motifs)"
- Otherwise, when there is NO strongly-matching paper to name, keep it SHORT: inspired by your work on <ONE concise area, 2-4 words> — NO parentheses, NO paper name.
    e.g. "inspired by your work on video retrieval"
- Use ONE concise area only — NEVER a comma- or "and"-separated list of their topics. All lowercase except proper nouns / acronyms / the paper name. No trailing period, no quotes. Never invent a paper. Max ~12 words if naming a paper; max ~8 words otherwise.

Style examples (paragraph):
${STYLE_EXAMPLES}

Return ONLY JSON: {"paragraph": "<the full paragraph>", "subject_line": "<the subject fragment>"}`;

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
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    console.error(`[personalize] OpenRouter ${r.status} for model "${model}": ${body.slice(0, 300)}`);
    throw new Error(`OpenRouter ${r.status}`);
  }
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const { paragraph, subjectLine } = extractResult(content);
  if (!paragraph) { console.error(`[personalize] model "${model}" returned no usable paragraph`); throw new Error("empty"); }
  return { paragraph, subjectLine: cleanSubjectLine(subjectLine) || fallbackSubject(topics, papers) };
}

export async function personalize(
  name: string,
  university: string,
  topics: string,
  papers: Paper[],
  interest = "",
  tone = "default",
): Promise<{ paragraph: string; subjectLine: string }> {
  const key = (process.env.OPENROUTER_API_KEY || "").trim();
  if (!key) {
    console.warn("[personalize] OPENROUTER_API_KEY is empty — using offline fallback (no AI).");
    return { paragraph: fallbackParagraph(topics, papers), subjectLine: fallbackSubject(topics, papers) };
  }
  const models = [
    process.env.OPENROUTER_MODEL_PRIMARY || "deepseek/deepseek-chat",
    process.env.OPENROUTER_MODEL_FALLBACK || "openai/gpt-4o-mini",
  ];
  for (const m of models) {
    try {
      return await callModel(m, name, university, topics, papers, interest, tone);
    } catch (e) {
      console.error(`[personalize] model "${m}" failed:`, (e as Error).message);
    }
  }
  console.error("[personalize] ALL models failed — falling back to the offline template. Check the OpenRouter errors above (401 = bad key, 402 = no credits, 404 = model id not found).");
  return { paragraph: fallbackParagraph(topics, papers), subjectLine: fallbackSubject(topics, papers) };
}
