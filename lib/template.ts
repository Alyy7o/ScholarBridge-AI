import type { Professor } from "./types";

export const DEFAULT_SUBJECT =
  "Prospective graduate student interested in your research";

export const DEFAULT_TEMPLATE = `Dear Professor {{professor_last_name}},

I am writing to express my strong interest in joining your research group at {{university}}. {{personalized}}

I have attached my CV for your consideration and would be grateful for the chance to discuss potential opportunities to work with you.

Thank you for your time.

Best regards,
{{your_name}}`;

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
): { subject: string; body: string } {
  const vars: Record<string, string> = {
    professor_name: prof.name,
    professor_last_name: lastName(prof.name || ""),
    university: prof.university || "your institution",
    topics: prof.topics || "",
    personalized,
    your_name: senderName || "Your Name",
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
