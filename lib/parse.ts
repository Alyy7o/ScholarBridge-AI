import * as XLSX from "xlsx";
import type { Professor } from "./types";

const PROF_ALIASES: Record<string, string[]> = {
  name: ["name", "professor", "professor name", "full name", "prof"],
  email: ["email", "e-mail", "email address", "contact"],
  university: ["university", "uni", "lab", "university/lab", "institution", "affiliation", "department", "school"],
  topics: ["topics", "topic", "research", "research topics", "interests", "research interests", "keywords", "area", "field", "fields", "area of research", "areas of research", "research area", "research field", "field of research", "specialization", "specialisation", "expertise", "focus"],
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
const HEADER_LINE_RE = /^(to:|recipient:|email:|subject:)/i;

/** Decode common HTML entities for plain-text parsing. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/** Turn email HTML into plain text (for To:/Subject: detection). */
function htmlToPlain(html: string): string {
  return decodeEntities(
    String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const SHORT_LINE = 100;
const CLOSING_RE =
  /^(regards|best regards|kind regards|warm regards|sincerely|yours sincerely|best|thanks|thank you|cheers|with regards)[,!.]?$/i;

function plainFromHtml(html: string): string {
  return decodeEntities(String(html || "").replace(/<[^>]+>/g, ""))
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keep allowlisted inline tags; drop everything else. */
function sanitizeInlineHtml(html: string): string {
  let x = String(html || "");
  x = x.replace(/<\/?b>/gi, (m) => (m.includes("/") ? "</strong>" : "<strong>"));
  x = x.replace(/<\/?i>/gi, (m) => (m.includes("/") ? "</em>" : "<em>"));
  const allowed = new Set(["strong", "em", "u", "br", "ul", "ol", "li", "a", "div", "span"]);
  x = x.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (_m, slash, tag, attrs) => {
    const t = String(tag).toLowerCase();
    if (!allowed.has(t)) return "";
    if (slash) return `</${t}>`;
    if (t === "br") return "<br>";
    if (t === "a") {
      const href = String(attrs).match(/href\s*=\s*["'](https?:\/\/[^"']*|mailto:[^"']*)["']/i);
      return href ? `<a href="${href[1]}">` : "<a>";
    }
    return `<${t}>`;
  });
  return x.replace(/^(?:<br\s*\/?>\s*)+|(?:<br\s*\/?>\s*)+$/gi, "").trim();
}

/**
 * Word/mammoth emit one <p> per Enter. Visual blank lines in Word are usually
 * paragraph spacing (not empty <p> tags). Restore a blank line between body
 * paragraphs, but keep signature / header short lines single-spaced.
 */
export function normalizeImportedHtml(html: string): string {
  let x = String(html || "");
  x = x.replace(/<!--[\s\S]*?-->/g, "");
  x = x.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  x = x.replace(/<img\b[^>]*>/gi, "");
  x = x.replace(/<\/?(?:html|body|head|meta|xml)[^>]*>/gi, "");

  const rawParas: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(x)) !== null) rawParas.push(m[1]);
  if (!rawParas.length) rawParas.push(x);

  const paras = rawParas.map((p) => sanitizeInlineHtml(p));

  let out = "";
  let prevPlain: string | null = null; // null = start; "" = explicit empty para

  for (const para of paras) {
    const plain = plainFromHtml(para);

    if (!plain) {
      // Explicit empty paragraph in Word → keep a blank line before next content
      prevPlain = "";
      continue;
    }

    if (out) {
      const afterEmpty = prevPlain === "";
      const afterClosing = !!prevPlain && CLOSING_RE.test(prevPlain);
      const bothShort =
        !!prevPlain && prevPlain.length <= SHORT_LINE && plain.length <= SHORT_LINE;
      // Body paragraphs (or short→long like "Dear…," → body) keep a blank line.
      // Consecutive short lines (signature / To+Subject) stay single-spaced,
      // except right after "Regards," etc.
      if (afterEmpty || afterClosing || !bothShort) out += "<br><br>";
      else out += "<br>";
    }

    out += para;
    prevPlain = plain;
  }

  out = out.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");
  return out.trim();
}

/** Drop leading To:/Subject: lines from imported HTML body; keep blank lines. */
function stripHeaderLinesFromHtml(html: string): string {
  const parts = String(html || "").split(/<br\s*\/?>/i);
  let i = 0;
  while (i < parts.length) {
    const plain = plainFromHtml(parts[i]);
    if (!plain) { i++; continue; }
    if (HEADER_LINE_RE.test(plain)) { i++; continue; }
    break;
  }
  // Re-join with <br>; empty slots become the blank lines between paragraphs
  return parts
    .slice(i)
    .join("<br>")
    .replace(/^(?:<br\s*\/?>\s*)+|(?:<br\s*\/?>\s*)+$/gi, "")
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .trim();
}

async function extractText(buf: Buffer, filename: string): Promise<string> {
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
    return (await pdf(buf)).text;
  }
  // DOCX is handled via extractDocxHtml — keep a plain fallback for callers
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  return buf.toString("utf-8");
}

async function extractDocxHtml(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml(
    { buffer: buf },
    {
      // Prefer semantic tags mammoth already emits; styleMap reinforces bold/italic
      styleMap: [
        "b => strong",
        "i => em",
        "u => u",
        "strike => s",
      ],
    },
  );
  return normalizeImportedHtml(value);
}

function parseBlock(block: string): { email: string; subject: string; body: string } | null {
  const lines = block.split("\n");
  let to: string | null = null;
  let subject: string | null = null;
  let bodyStart = 0;
  lines.slice(0, 8).forEach((ln, i) => {
    const low = ln.toLowerCase().trim();
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
  // Cap runaway blank runs; keep a single blank line for intentional spacing
  body = body.replace(/\n{3,}/g, "\n\n");
  if (subject === null) {
    const first = body.split("\n").find((l) => l.trim()) || "";
    subject = first.slice(0, 80) || "(no subject)";
  }
  return { email: to, subject, body };
}

function parseHtmlBlock(html: string): { email: string; subject: string; body: string } | null {
  const plain = htmlToPlain(html);
  const parsed = parseBlock(plain);
  if (!parsed) return null;
  const bodyHtml = stripHeaderLinesFromHtml(html);
  return {
    email: parsed.email,
    subject: parsed.subject,
    body: bodyHtml || parsed.body,
  };
}

function splitHtmlEmailBlocks(html: string): string[] {
  const parts = html
    .split(/(?:<br\s*\/?>\s*){3,}|(?:<br\s*\/?>\s*)[-=_*]{3,}(?:\s*<br\s*\/?>)/i)
    .map((b) => b.trim())
    .filter(Boolean);
  return parts.length ? parts : [html];
}

export async function parseReadyEmails(buf: Buffer, filename: string): Promise<{ email: string; subject: string; body: string }[]> {
  const name = filename.toLowerCase();

  // DOCX: keep bold/italic/links and tight line spacing via HTML
  if (name.endsWith(".docx")) {
    const html = await extractDocxHtml(buf);
    const out = [];
    for (const b of splitHtmlEmailBlocks(html)) {
      const p = parseHtmlBlock(b);
      if (p) out.push(p);
    }
    return out;
  }

  const text = await extractText(buf, filename);
  // Word-like plain extracts often insert blank lines between every paragraph —
  // normalize those before block-splitting so bodies aren't double-spaced.
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const blocks = normalized.split(/\n\s*(?:[-=_*]{3,})\s*\n|\n{3,}/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  for (const b of blocks.length ? blocks : [normalized]) {
    const p = parseBlock(b);
    if (p) out.push(p);
  }
  return out;
}
