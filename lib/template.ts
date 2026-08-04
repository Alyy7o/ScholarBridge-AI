import type { Professor } from "./types";

export const DEFAULT_SUBJECT =
  "Prospective Research Student - {{subject_line}}";

export type TemplateProfile = {
  senderName?: string;
  university?: string;
  cgpa?: string;
  workBlurb?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  targetIntake?: string;
};

/** Research-centric cold email: intro → AI research bridge → merged bio+ask → thanks → signature.
 *  No scholarship/MEXT pitch — keep the ask about joining the lab / research fit. */
export const DEFAULT_TEMPLATE = `Dear Professor {{professor_last_name}},

My name is {{your_name}}, a final-year Computer Science student at {{university}}. I am writing to explore the possibility of joining your lab as a graduate research student ({{target_intake}}).

{{personalized}}

Alongside my studies (CGPA {{cgpa}}), {{work_blurb}} I have attached my CV and would be grateful for a short reply or a brief online meeting if my background might fit your group's directions.

Thank you for your time and consideration.

Best regards,
{{your_name}}
{{university}}
{{phone}}
{{your_email}}
LinkedIn: {{linkedin}}`;

const PROFILE_FALLBACKS: Required<TemplateProfile> = {
  senderName: "Ali Javed",
  university: "the National University of Modern Languages (NUML), Faisalabad, Pakistan",
  cgpa: "3.48/4.0",
  workBlurb:
    "I have over two years of experience in software and AI development as a Full Stack Developer at Xylator AI.",
  phone: "+92 323 6577801",
  email: "alijaved.developer@gmail.com",
  linkedin: "https://www.linkedin.com/in/ali-javed-7o/",
  targetIntake: "Fall 2027",
};

function lastName(full: string): string {
  const parts = full.replace(/\./g, " ").split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : full;
}

export function renderTemplate(
  template: string,
  subjectTemplate: string,
  prof: Professor,
  personalized: string,
  senderName: string,
  subjectLine = "",
  profile: TemplateProfile = {},
): { subject: string; body: string } {
  const vars: Record<string, string> = {
    professor_name: prof.name,
    professor_last_name: lastName(prof.name || ""),
    university: profile.university || PROFILE_FALLBACKS.university,
    topics: prof.topics || "",
    personalized,
    your_name: senderName || profile.senderName || PROFILE_FALLBACKS.senderName,
    subject_line: subjectLine,
    cgpa: profile.cgpa || PROFILE_FALLBACKS.cgpa,
    work_blurb: profile.workBlurb || PROFILE_FALLBACKS.workBlurb,
    phone: profile.phone || PROFILE_FALLBACKS.phone,
    your_email: profile.email || PROFILE_FALLBACKS.email,
    linkedin: profile.linkedin || PROFILE_FALLBACKS.linkedin,
    target_intake: profile.targetIntake || PROFILE_FALLBACKS.targetIntake,
  };
  let body = template || DEFAULT_TEMPLATE;
  let subject = subjectTemplate || DEFAULT_SUBJECT;
  for (const [k, v] of Object.entries(vars)) {
    const token = `{{${k}}}`;
    body = body.split(token).join(v);
    subject = subject.split(token).join(v);
  }
  return { subject, body };
}
