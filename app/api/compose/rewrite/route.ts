import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { findPapers } from "@/lib/research";
import { personalize, isAiEnabled } from "@/lib/personalize";
import { renderTemplate, DEFAULT_TEMPLATE, DEFAULT_SUBJECT } from "@/lib/template";
import { stripHtml } from "@/lib/text";

export const maxDuration = 60;

/**
 * Re-search papers for one professor (excluding previously used titles) and
 * regenerate a single personalized email draft.
 */
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const professor_name = String(body.professor_name || "").trim();
  const email = String(body.email || "").trim();
  if (!professor_name && !email) return err("professor_name or email required");

  const university = String(body.university || "").trim();
  const topics = String(body.topics || "").trim();
  const searchTopics = String(body.search_topics || "").trim();
  const tone = String(body.tone || "default").trim();
  const templateId = String(body.template_id || "").trim();
  const papersUsed: string[] = Array.isArray(body.papers_used)
    ? body.papers_used.map((t: unknown) => String(t || ""))
    : [];

  let template = String(body.template || "").trim();
  let subject = String(body.subject || "").trim();

  if (templateId) {
    const { data: t } = await sb.from("email_templates").select("*").eq("id", templateId).maybeSingle();
    if (t) {
      template = template || t.body;
      // Prefer the template subject for rewrite so AI subject_line can refill;
      // only keep an explicit override when no template subject exists.
      if (!subject) subject = t.subject || "";
    }
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

  const p = {
    name: professor_name || email,
    email,
    university,
    topics,
  };

  const topicsForSearch = searchTopics || topics || "";
  // Fetch a larger page of works, skip titles already used, prefer page 2 so
  // we surface different papers than the initial draft when possible.
  let { papers, source } = await findPapers(p.name, university, 4, topicsForSearch, {
    excludeTitles: papersUsed,
    page: 2,
    fetchLimit: 20,
  });
  // If page 2 + exclusions yielded nothing, try page 1 with exclusions only.
  if (!papers.length && papersUsed.length) {
    const retry = await findPapers(p.name, university, 4, topicsForSearch, {
      excludeTitles: papersUsed,
      page: 1,
      fetchLimit: 20,
    });
    papers = retry.papers;
    source = retry.source;
  }
  // Last resort: any papers (may overlap) so we still regenerate the text.
  if (!papers.length) {
    const fallback = await findPapers(p.name, university, 4, topicsForSearch);
    papers = fallback.papers;
    source = fallback.source;
  }

  const { paragraph, subjectLine } = await personalize(
    p.name,
    university,
    topics || searchTopics || "",
    papers,
    searchTopics || topics || "",
    tone,
    profile?.ai_background,
  );
  const { subject: subj, body: emailBody } = renderTemplate(
    template,
    subject,
    p,
    paragraph,
    senderName,
    subjectLine,
    templateProfile,
  );

  return json({
    email: {
      professor_name: p.name,
      email: p.email,
      university,
      topics,
      subject: subj,
      body: emailBody,
      personalized: paragraph,
      subject_line: subjectLine,
      research_source: source,
      papers_used: papers.map((x) => stripHtml(x.title)),
      workflow: "ai",
    },
    ai_enabled: isAiEnabled(),
  });
}
