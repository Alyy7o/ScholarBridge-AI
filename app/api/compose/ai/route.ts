import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { parseProfessors } from "@/lib/parse";
import { findPapers } from "@/lib/research";
import { personalize } from "@/lib/personalize";
import { renderTemplate, DEFAULT_TEMPLATE, DEFAULT_SUBJECT } from "@/lib/template";
import type { Professor } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const templateId = String(form.get("template_id") || "");
  let template = String(form.get("template") || "").trim();
  let subject = String(form.get("subject") || "").trim();

  let profs: Professor[] = [];
  if (file) {
    try {
      profs = parseProfessors(Buffer.from(await file.arrayBuffer()));
    } catch (e) {
      return err(`Could not read Excel: ${(e as Error).message}`);
    }
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

  const { data: profile } = await sb.from("profiles").select("sender_name").eq("id", user.id).maybeSingle();
  const senderName = profile?.sender_name || "Your Name";

  const emails = await Promise.all(
    profs.map(async (p) => {
      const { papers, source } = await findPapers(p.name, p.university || "", 4);
      const lines = await personalize(p.name, p.university || "", p.topics || "", papers);
      const { subject: subj, body } = renderTemplate(template, subject, p, lines, senderName);
      return {
        professor_name: p.name, email: p.email, university: p.university || "",
        topics: p.topics || "", subject: subj, body, personalized: lines,
        research_source: source, papers_used: papers.map((x) => x.title), workflow: "ai",
      };
    }),
  );
  return json({ emails, ai_enabled: !!process.env.OPENROUTER_API_KEY });
}
