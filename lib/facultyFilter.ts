/**
 * Heuristic faculty classifier for OpenAlex authors.
 * OpenAlex has no professor-rank field, so we combine affiliation title text,
 * institution type, and publication seniority / authorship role.
 */

export const MIN_WORKS_FACULTY = 8;
export const MIN_CITATIONS_SOFT = 20;

/** Strong student / trainee patterns → always drop when faculty_only is on. */
const STUDENT_RE =
  /\b(ph\.?\s*d\.?\s*student|phd\s*student|ph\.?\s*d\.?\s*candidate|phd\s*candidate|doctoral\s*student|doctorate\s*student|graduate\s*student|grad(?:uate)?\s*student|master'?s?\s*student|m\.?\s*s\.?\s*student|undergraduate|undergrad(?:uate)?\s*student|bachelor'?s?\s*student|research\s*intern|summer\s*intern|intern)\b/i;

/** Postdoc / fellow — default drop (usually cannot independently accept students). */
const POSTDOC_RE =
  /\b(post[\s-]?doc(?:toral)?(?:\s+(?:fellow|researcher|associate))?|research\s+fellow|visiting\s+scholar|visiting\s+researcher)\b/i;

/** Faculty titles that can typically accept students. */
const FACULTY_RE =
  /\b((?:full|associate|assistant|adjunct|clinical|research)\s+professor|professor|senior\s+lecturer|lecturer|faculty(?:\s+member)?|chair(?:person)?|head\s+of\s+(?:department|dept))\b/i;

/** Industry role hints (used with non-education institution). */
const INDUSTRY_ROLE_RE =
  /\b(software\s+engineer|research\s+engineer|data\s+scientist|machine\s+learning\s+engineer|ml\s+engineer|applied\s+scientist|staff\s+engineer|principal\s+engineer)\b/i;

export type TitleSignal = "faculty" | "student" | "postdoc" | "industry" | "none";

export type WorkAuthorshipSignal = {
  rawAffiliations: string[];
  institutionTypes: string[];
  isCorresponding: boolean;
  authorPosition: string | null; // first | middle | last
};

export type FacultySignals = {
  /** Aggregated raw affiliation strings from matched works + author profile. */
  affiliationTexts: string[];
  /** Institution types seen on matched works and last_known (education, company, …). */
  institutionTypes: string[];
  worksCount: number;
  citedByCount: number;
  correspondingCount: number;
  lastAuthorCount: number;
  firstAuthorOnly: boolean; // appeared only as first author on matched works
};

export type FacultyVerdict = {
  keep: boolean;
  confidence: "professor" | "likely_faculty" | "rejected";
  reason: string;
  titleSignal: TitleSignal;
};

export function classifyTitleText(text: string): TitleSignal {
  const t = String(text || "");
  if (!t.trim()) return "none";
  if (STUDENT_RE.test(t)) return "student";
  if (POSTDOC_RE.test(t)) return "postdoc";
  if (FACULTY_RE.test(t)) return "faculty";
  if (INDUSTRY_ROLE_RE.test(t)) return "industry";
  return "none";
}

/** Best (strongest reject/accept) signal across many affiliation strings. */
export function classifyAffiliationTexts(texts: string[]): TitleSignal {
  let best: TitleSignal = "none";
  for (const raw of texts) {
    const s = classifyTitleText(raw);
    if (s === "student") return "student";
    if (s === "postdoc" && best !== "student") best = "postdoc";
    if (s === "industry" && best === "none") best = "industry";
    if (s === "faculty" && best !== "student" && best !== "postdoc") best = "faculty";
  }
  return best;
}

export function extractAffiliationTextsFromAuthorship(au: any): string[] {
  const out: string[] = [];
  for (const s of au?.raw_affiliation_strings || []) {
    if (typeof s === "string" && s.trim()) out.push(s);
  }
  for (const a of au?.affiliations || []) {
    const raw = a?.raw_affiliation_string;
    if (typeof raw === "string" && raw.trim()) out.push(raw);
  }
  return out;
}

export function collectWorkAuthorshipSignal(au: any): WorkAuthorshipSignal {
  const institutionTypes = (au?.institutions || [])
    .map((i: any) => String(i?.type || "").toLowerCase())
    .filter(Boolean);
  return {
    rawAffiliations: extractAffiliationTextsFromAuthorship(au),
    institutionTypes,
    isCorresponding: !!au?.is_corresponding,
    authorPosition: au?.author_position ? String(au.author_position) : null,
  };
}

function hasEducation(types: string[]): boolean {
  return types.some((t) => t === "education");
}

function isCompanyOnly(types: string[]): boolean {
  const uniq = [...new Set(types.filter(Boolean))];
  if (!uniq.length) return false;
  return uniq.every((t) => t === "company" || t === "facility" || t === "other");
}

/**
 * Decide whether an author is likely faculty who can accept students.
 * When signals conflict lightly: drop on student patterns; keep untitled mid-career edu authors.
 */
export function isLikelyFaculty(signals: FacultySignals): FacultyVerdict {
  const titleSignal = classifyAffiliationTexts(signals.affiliationTexts);

  if (titleSignal === "student") {
    return { keep: false, confidence: "rejected", reason: "student_title", titleSignal };
  }
  if (titleSignal === "postdoc") {
    return { keep: false, confidence: "rejected", reason: "postdoc_title", titleSignal };
  }

  const edu = hasEducation(signals.institutionTypes);
  const companyOnly = isCompanyOnly(signals.institutionTypes);

  if (titleSignal === "industry" && (companyOnly || !edu)) {
    return { keep: false, confidence: "rejected", reason: "industry_role", titleSignal };
  }

  if (companyOnly && titleSignal !== "faculty") {
    return { keep: false, confidence: "rejected", reason: "company_affiliation", titleSignal };
  }

  if (titleSignal === "faculty") {
    return { keep: true, confidence: "professor", reason: "faculty_title", titleSignal };
  }

  // No clear title — seniority / role heuristics
  const works = signals.worksCount || 0;
  const cites = signals.citedByCount || 0;
  const seniorRole = signals.correspondingCount > 0 || signals.lastAuthorCount > 0;

  if (!edu && signals.institutionTypes.length > 0 && !seniorRole) {
    return { keep: false, confidence: "rejected", reason: "non_education", titleSignal };
  }

  if (works < MIN_WORKS_FACULTY && !seniorRole) {
    return { keep: false, confidence: "rejected", reason: "low_works", titleSignal };
  }

  // First-author-only juniors with modest careers look like students/postdocs
  if (signals.firstAuthorOnly && works < MIN_WORKS_FACULTY * 2 && !seniorRole) {
    return { keep: false, confidence: "rejected", reason: "junior_first_author", titleSignal };
  }

  if (works >= MIN_WORKS_FACULTY || seniorRole || cites >= MIN_CITATIONS_SOFT) {
    return {
      keep: true,
      confidence: "likely_faculty",
      reason: seniorRole ? "senior_authorship" : "seniority",
      titleSignal,
    };
  }

  return { keep: false, confidence: "rejected", reason: "insufficient_signal", titleSignal };
}

/** Lightweight check for mined cache rows (often missing works_count). */
export function isLikelyFacultyCacheRow(row: {
  name?: string;
  institution?: string;
  field?: string;
  works_count?: number;
}): boolean {
  const blob = [row.name, row.institution, row.field].filter(Boolean).join(" ");
  const title = classifyTitleText(blob);
  if (title === "student" || title === "postdoc") return false;
  if (title === "faculty") return true;
  // Cache rows without works data: keep unless clearly non-faculty
  if (typeof row.works_count === "number" && row.works_count > 0 && row.works_count < MIN_WORKS_FACULTY) {
    return false;
  }
  return true;
}
