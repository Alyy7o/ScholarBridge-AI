import * as XLSX from "xlsx";
import type { Professor } from "./types";

const PROF_ALIASES: Record<string, string[]> = {
  name: ["name", "professor", "professor name", "full name", "prof"],
  email: ["email", "e-mail", "email address", "contact"],
  university: ["university", "uni", "lab", "university/lab", "institution", "affiliation", "department", "school"],
  topics: ["topics", "topic", "research", "research topics", "interests", "research interests", "keywords", "area"],
};

const READY_ALIASES: Record<string, string[]> = {
  email: ["email", "e-mail", "recipient", "to", "address"],
  subject: ["subject", "title", "subject line"],
  body: ["body", "message", "content", "email body", "text"],
};

function sheetRows(buf: Buffer): Record<string, any>[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function resolve(cols: string[], aliases: Record<string, string[]>): Record<string, string> {
  const lookup: Record<string, string> = {};
  cols.forEach((c) => (lookup[String(c).trim().toLowerCase()] = c));
  const res: Record<string, string> = {};
  for (const [field, al] of Object.entries(aliases)) {
    for (const a of al) if (a in lookup) { res[field] = lookup[a]; break; }
  }
  return res;
}

export function parseProfessors(buf: Buffer): Professor[] {
  const rows = sheetRows(buf);
  if (!rows.length) return [];
  const cols = resolve(Object.keys(rows[0]), PROF_ALIASES);
  if (!cols.name || !cols.email) {
    throw new Error(`Excel must have Name and Email columns. Found: ${Object.keys(rows[0]).join(", ")}`);
  }
  const out: Professor[] = [];
  for (const r of rows) {
    const email = String(r[cols.email] ?? "").trim();
    if (!email.includes("@")) continue;
    out.push({
      name: String(r[cols.name] ?? "").trim(),
      email,
      university: cols.university ? String(r[cols.university] ?? "").trim() : "",
      topics: cols.topics ? String(r[cols.topics] ?? "").trim() : "",
    });
  }
  return out;
}

export function parseExcelReady(buf: Buffer): { email: string; subject: string; body: string }[] {
  const rows = sheetRows(buf);
  if (!rows.length) return [];
  const cols = resolve(Object.keys(rows[0]), READY_ALIASES);
  const missing = ["email", "subject", "body"].filter((f) => !cols[f]);
  if (missing.length) throw new Error(`Missing column(s): ${missing.join(", ")}`);
  const out = [];
  for (const r of rows) {
    const email = String(r[cols.email] ?? "").trim();
    if (!email.includes("@")) continue;
    out.push({
      email,
      subject: String(r[cols.subject] ?? "").trim(),
      body: String(r[cols.body] ?? "").trim(),
    });
  }
  return out;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;

async function extractText(buf: Buffer, filename: string): Promise<string> {
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
    return (await pdf(buf)).text;
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  return buf.toString("utf-8");
}

function parseBlock(block: string): { email: string; subject: string; body: string } | null {
  const lines = block.split("\n");
  let to: string | null = null;
  let subject: string | null = null;
  let bodyStart = 0;
  lines.slice(0, 8).forEach((ln, i) => {
    const low = ln.toLowerCase();
    if (to === null && /^(to:|recipient:|email:)/.test(low)) {
      const m = ln.match(EMAIL_RE);
      if (m) { to = m[0]; bodyStart = i + 1; }
    } else if (subject === null && low.startsWith("subject:")) {
      subject = ln.split(":").slice(1).join(":").trim();
      bodyStart = Math.max(bodyStart, i + 1);
    }
  });
  if (to === null) { const m = block.match(EMAIL_RE); to = m ? m[0] : null; }
  if (!to) return null;
  let body = lines.slice(bodyStart).join("\n").trim() || block.trim();
  if (subject === null) {
    const first = body.split("\n").find((l) => l.trim()) || "";
    subject = first.slice(0, 80) || "(no subject)";
  }
  return { email: to, subject, body };
}

export async function parseReadyEmails(buf: Buffer, filename: string): Promise<{ email: string; subject: string; body: string }[]> {
  const text = await extractText(buf, filename);
  const blocks = text.split(/\n\s*(?:[-=_*]{3,})\s*\n|\n{3,}/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  for (const b of blocks.length ? blocks : [text]) {
    const p = parseBlock(b);
    if (p) out.push(p);
  }
  return out;
}
