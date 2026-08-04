import type { Paper } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// The applicant's background, woven into every email. Override with the
// STUDENT_BACKGROUND env var without touching code.
const STUDENT_BACKGROUND =
  process.env.STUDENT_BACKGROUND ||
  'As co-author of "NeuroClip: A Deep Learning Enabled Context-Aware Multimodal System for Video Retrieval and Compression" (submitted to IBCAST 2026), I worked on aligning video content with text-based queries for retrieval.';

const SYSTEM =
  "You write concise, specific, personal academic outreach for a prospective " +
  "graduate student. Never invent papers, facts, or results — use only the papers " +
  "provided. Match the requested paragraph structure and tone exactly. Return only JSON.";

const TONE_INSTRUCTIONS: Record<string, string> = {
  short: "LENGTH: very brief — exactly 2 crisp sentences, no more.",
  long: "LENGTH: a fuller paragraph of 5-6 sentences with a little more specific detail.",
  warm: "VOICE: warm and enthusiastic — convey genuine excitement about their work, personable but not gushing.",
  friendly: "VOICE: friendly and approachable — relaxed, personable phrasing while staying respectful.",
  polite: "VOICE: highly polite and deferential — courteous, formal phrasing (e.g. 'I would be most grateful', 'if you would kindly').",
  professional: "VOICE: formal and professional — precise, measured, businesslike, no casual phrasing.",
  default: "",
};

const STYLE_EXAMPLES = `Example A:
I have been following your lab's work combining computer vision with natural language, and your recent work on mitigating temporal hallucination in video understanding with multimodal large language models was especially interesting to me, because understanding video content together with language is closely connected to what I have been working on. As co-author of "NeuroClip: A Deep Learning Enabled Context-Aware Multimodal System for Video Retrieval and Compression" (submitted to IBCAST 2026), I worked on aligning video content with text-based queries for retrieval, so your group's direction in vision and language is exactly the area I would like to pursue in more depth under your guidance.

Example B:
I have been following your lab's work on cross-modal and composed video retrieval, and your recent work on automatically constructing triplets for composed video retrieval was especially interesting to me, because retrieving a target video from a query plus a modification is very close to what I have been working on. As co-author of "NeuroClip: A Deep Learning Enabled Context-Aware Multimodal System for Video Retrieval and Compression" (submitted to IBCAST 2026), I worked on aligning video content with text-based queries for retrieval, so your group's direction in cross-modal video retrieval is exactly the area I would like to pursue in more depth under your guidance.

Example C (used when the topic is farther from the applicant's, still specific and honest):
I have been following your lab's work in physics-based computer vision and human modeling, and your recent work on neural optimization for multiview human mesh recovery was especially interesting to me, particularly the idea of framing perception as an optimization problem solved by a learned model. As co-author of "NeuroClip: A Deep Learning Enabled Context-Aware Multimodal System for Video Retrieval and Compression" (submitted to IBCAST 2026), I worked on aligning video content with text-based queries for retrieval; while that sits closer to the retrieval and multimodal side of vision, it gave me a strong foundation in deep learning for video that I would be eager to extend toward the problems your lab studies.`;

type ProviderId = "gemini" | "groq" | "openrouter";

type Provider = {
  id: ProviderId;
  label: string;
  model: string;
  ready: boolean;
  call: (prompt: string) => Promise<string>;
};

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

function firstArea(topics: string): string {
  const t = (topics || "").split(/[,;]/)[0].trim();
  return t || "your research area";
}

function fallbackParagraph(topics: string, papers: Paper[]): string {
  const area = firstArea(topics);
  if (papers.length) {
    return `I have been following your lab's work on ${area}, and I found your recent paper "${papers[0].title}" especially compelling. ${STUDENT_BACKGROUND} I would be grateful for the opportunity to explore ${area} in more depth under your guidance.`;
  }
  return `I have been following your lab's work on ${area}, which closely aligns with my own research interests. ${STUDENT_BACKGROUND} I would be grateful for the opportunity to explore this direction in more depth under your guidance.`;
}

function fallbackSubject(topics: string, _papers: Paper[]): string {
  return `inspired by your work on ${firstArea(topics).toLowerCase()}`;
}

function cleanSubjectLine(s: string): string {
  let x = (s || "").trim();
  x = x.replace(/^prospective research student\s*[-–—:]\s*/i, "");
  x = x.replace(/^[-–—:\s]+/, "");
  x = x.replace(/[.\s"']+$/, "");
  return x.trim();
}

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
  if (paragraph && (paragraph.startsWith("{") || paragraph.startsWith("```") || paragraph.startsWith("["))) paragraph = "";
  return { paragraph, subjectLine };
}

function buildUserPrompt(
  name: string,
  university: string,
  topics: string,
  papers: Paper[],
  interest: string,
  tone: string,
): string {
  const toneLine = TONE_INSTRUCTIONS[tone] || "";
  return `Write ONE personalized paragraph AND one short subject-line fragment for a cold email to a professor, in the exact style of the examples.

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
}

/** True if any AI provider key is configured. */
export function isAiEnabled(): boolean {
  return !!(
    (process.env.GEMINI_API_KEY || "").trim() ||
    (process.env.GROQ_API_KEY || "").trim() ||
    (process.env.OPENROUTER_API_KEY || "").trim()
  );
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    console.error(`[personalize] Gemini ${r.status} (${model}): ${body.slice(0, 300)}`);
    throw new Error(`Gemini ${r.status}`);
  }
  const data = await r.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: { text?: string }) => p?.text || "").join("")
    : "";
  if (!text) throw new Error("Gemini empty");
  return text;
}

async function callOpenAiCompatible(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  label: string,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    console.error(`[personalize] ${label} ${r.status} (${model}): ${body.slice(0, 300)}`);
    throw new Error(`${label} ${r.status}`);
  }
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error(`${label} empty`);
  return content;
}

function buildProviders(): Provider[] {
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || "").trim();

  const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const openrouterModel =
    process.env.OPENROUTER_MODEL_PRIMARY || "deepseek/deepseek-chat";
  const openrouterFallback =
    process.env.OPENROUTER_MODEL_FALLBACK || "qwen/qwen-2.5-32b-instruct";

  const providers: Provider[] = [
    {
      id: "gemini",
      label: "Gemini",
      model: geminiModel,
      ready: !!geminiKey,
      call: (prompt) => callGemini(geminiModel, prompt),
    },
    {
      id: "groq",
      label: "Groq",
      model: groqModel,
      ready: !!groqKey,
      call: (prompt) => callOpenAiCompatible(GROQ_URL, groqKey, groqModel, prompt, "Groq"),
    },
    {
      id: "openrouter",
      label: "OpenRouter",
      model: openrouterModel,
      ready: !!openrouterKey,
      call: (prompt) =>
        callOpenAiCompatible(OPENROUTER_URL, openrouterKey, openrouterModel, prompt, "OpenRouter", {
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://scholarbridge.ai",
          "X-Title": "ScholarBridge AI",
        }),
    },
  ];

  // Second OpenRouter model as an extra step when primary OpenRouter fails.
  if (openrouterKey && openrouterFallback && openrouterFallback !== openrouterModel) {
    providers.push({
      id: "openrouter",
      label: "OpenRouter",
      model: openrouterFallback,
      ready: true,
      call: (prompt) =>
        callOpenAiCompatible(OPENROUTER_URL, openrouterKey, openrouterFallback, prompt, "OpenRouter", {
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://scholarbridge.ai",
          "X-Title": "ScholarBridge AI",
        }),
    });
  }

  return providers;
}

export async function personalize(
  name: string,
  university: string,
  topics: string,
  papers: Paper[],
  interest = "",
  tone = "default",
): Promise<{ paragraph: string; subjectLine: string }> {
  const providers = buildProviders().filter((p) => p.ready);
  if (!providers.length) {
    console.warn("[personalize] No AI API keys set (GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY) — offline fallback.");
    return { paragraph: fallbackParagraph(topics, papers), subjectLine: fallbackSubject(topics, papers) };
  }

  const prompt = buildUserPrompt(name, university, topics, papers, interest, tone);

  for (const p of providers) {
    try {
      const raw = await p.call(prompt);
      const { paragraph, subjectLine } = extractResult(raw);
      if (!paragraph) {
        console.error(`[personalize] ${p.label}/${p.model} returned no usable paragraph`);
        throw new Error("empty");
      }
      console.log(`[personalize] ok via ${p.label} (${p.model})`);
      return {
        paragraph,
        subjectLine: cleanSubjectLine(subjectLine) || fallbackSubject(topics, papers),
      };
    } catch (e) {
      console.error(`[personalize] ${p.label}/${p.model} failed:`, (e as Error).message);
    }
  }

  console.error("[personalize] ALL providers failed — offline template. Check GEMINI / GROQ / OPENROUTER keys and quotas.");
  return { paragraph: fallbackParagraph(topics, papers), subjectLine: fallbackSubject(topics, papers) };
}
