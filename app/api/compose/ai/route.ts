import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { parseProfessors } from "@/lib/parse";
import { findPapers } from "@/lib/research";
import { personalize, isAiEnabled } from "@/lib/personalize";
import { renderTemplate, DEFAULT_TEMPLATE, DEFAULT_SUBJECT } from "@/lib/template";
import { stripHtml } from "@/lib/text";
import type { Professor } from "@/lib/types";

export const maxDuration = 60;

/** Run async work over items with a fixed concurrency (protects free-tier RPM/TPM). */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const templateId = String(form.get("template_id") || "");
  let template = String(form.get("template") || "").trim();
  let subject = String(form.get("subject") || "").trim();
  const searchTopics = String(form.get("search_topics") || "").trim();
  const tone = String(form.get("tone") || "default").trim();

  const bucketId = String(form.get("bucket_id") || "").trim();

  let profs: Professor[] = [];
  if (file) {
    try {
      profs = parseProfessors(Buffer.from(await file.arrayBuffer()));
    } catch (e) {
      return err(`Could not read Excel: ${(e as Error).message}`);
    }
  } else if (bucketId) {
    const { data: members } = await sb
      .from("professor_bucket_members")
      .select("professor_id")
      .eq("bucket_id", bucketId);
    const ids = (members || []).map((m) => m.professor_id);
    if (!ids.length) return err("That bucket has no professors yet.");
    const { data } = await sb.from("professors").select("*").in("id", ids);
    profs = (data || []) as Professor[];
  } else {
    const ids: string[] = JSON.parse(String(form.get("professor_ids") || "[]"));
    let q = sb.from("professors").select("*");
    if (ids.length) q = q.in("id", ids);
    const { data } = await q;
    profs = (data || []) as Professor[];
  }
  if (!profs.length) return err("No professors to process.");

  if (templateId) {
    const { data: t } = await sb.from("email_templates").select("*").eq("id", templateId).maybeSingle();
    if (t) { template = template || t.body; subject = subject || t.subject; }
  }
  template = template || DEFAULT_TEMPLATE;
  subject = subject || DEFAULT_SUBJECT;

  const { data: profile } = await sb
    .from("profiles")
    .select("sender_name, ai_background, university, cgpa, work_blurb, phone, linkedin_url, target_intake, email")
    .eq("id", user.id)
    .maybeSingle();
  const senderName = profile?.sender_name || "Ali Javed";
  const templateProfile = {
    senderName,
    university: profile?.university || undefined,
    cgpa: profile?.cgpa || undefined,
    workBlurb: profile?.work_blurb || undefined,
    phone: profile?.phone || undefined,
    email: profile?.email || user.email || undefined,
    linkedin: profile?.linkedin_url || undefined,
    targetIntake: profile?.target_intake || undefined,
  };

  // Cap parallel AI calls so Gemini/Groq free tiers don't 429 the whole batch.
  const concurrency = Math.max(1, Math.min(8, Number(process.env.COMPOSE_AI_CONCURRENCY || 4) || 4));

  const emails = await mapPool(profs, concurrency, async (p) => {
    const topicsForSearch = searchTopics || p.topics || "";
    const { papers, source } = await findPapers(p.name, p.university || "", 4, topicsForSearch);
    const { paragraph, subjectLine } = await personalize(
      p.name,
      p.university || "",
      p.topics || searchTopics || "",
      papers,
      searchTopics || p.topics || "",
      tone,
      profile?.ai_background,
    );
    const { subject: subj, body } = renderTemplate(
      template,
      subject,
      p,
      paragraph,
      senderName,
      subjectLine,
      templateProfile,
    );
    return {
      professor_name: p.name,
      email: p.email,
      university: p.university || "",
      topics: p.topics || "",
      subject: subj,
      body,
      personalized: paragraph,
      subject_line: subjectLine,
      research_source: source,
      papers_used: papers.map((x) => stripHtml(x.title)),
      workflow: "ai",
    };
  });

  return json({ emails, ai_enabled: isAiEnabled() });
}
