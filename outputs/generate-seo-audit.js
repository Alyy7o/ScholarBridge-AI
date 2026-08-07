const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'scholar-bridge-ai.vercel.app';
const DATE = '2026-08-08';
const AUDIT_TYPE = 'FULL AUDIT';
const CONTENT_W = 9360;
const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1440;

const C = {
  navy: '1B2A4A',
  blue: '2563EB',
  green: '16A34A',
  amber: 'D97706',
  red: 'DC2626',
  orange: 'EA580C',
  lightGray: 'F8F9FA',
  border: 'E2E8F0',
  dark: '1E293B',
  lightBlue: 'EFF6FF',
  lightGreen: 'F0FDF4',
  white: 'FFFFFF',
  softBlue: '93C5FD',
  gray: '94A3B8',
};

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: C.border };
const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function scoreColor(n) {
  if (n >= 8) return C.green;
  if (n >= 5) return C.amber;
  return C.red;
}
function statusWord(n) {
  if (n >= 8) return 'Strong';
  if (n >= 5) return 'On Track';
  return 'Needs Work';
}
function statusLabel(kind) {
  if (kind === 'good') return { text: 'Good', color: C.green };
  if (kind === 'warn') return { text: 'Needs Attention', color: C.amber };
  return { text: 'Missing', color: C.red };
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 0, after: opts.after || 120 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: opts.size || 22,
        bold: !!opts.bold,
        italics: !!opts.italics,
        color: opts.color || C.dark,
      }),
    ],
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: 'Arial', size: 48, bold: true, color: C.navy })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: C.dark })],
  });
}

function cell(text, opts = {}) {
  const width = opts.width || Math.floor(CONTENT_W / 3);
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: opts.borders || thinBorders,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: opts.padT || 80, bottom: opts.padB || 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(text),
            font: 'Arial',
            size: opts.size || 20,
            bold: !!opts.bold,
            italics: !!opts.italics,
            color: opts.color || C.dark,
          }),
        ],
      }),
      ...(opts.extra || []),
    ],
  });
}

function multiCell(paragraphs, opts = {}) {
  return new TableCell({
    width: { size: opts.width || Math.floor(CONTENT_W / 3), type: WidthType.DXA },
    borders: opts.borders || thinBorders,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: opts.padT || 120, bottom: opts.padB || 120, left: 100, right: 100 },
    children: paragraphs,
  });
}

function signalTable(rows) {
  const w1 = 2400, w2 = 5160, w3 = 1800;
  const header = new TableRow({
    children: [
      cell('Signal', { width: w1, bold: true, fill: C.navy, color: C.white }),
      cell('Finding', { width: w2, bold: true, fill: C.navy, color: C.white }),
      cell('Status', { width: w3, bold: true, fill: C.navy, color: C.white, align: AlignmentType.CENTER }),
    ],
  });
  const body = rows.map((r, i) => {
    const st = statusLabel(r.status);
    return new TableRow({
      children: [
        cell(r.signal, { width: w1, bold: true, fill: i % 2 ? C.lightGray : C.white }),
        cell(r.finding, { width: w2, fill: i % 2 ? C.lightGray : C.white, size: 18 }),
        cell(st.text, { width: w3, fill: st.color, color: C.white, bold: true, align: AlignmentType.CENTER, size: 18 }),
      ],
    });
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [w1, w2, w3], rows: [header, ...body] });
}

const scores = { seo: 3, geo: 3, aeo: 2 };
const combined = scores.seo + scores.geo + scores.aeo;

const coverScoreTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [3120, 3120, 3120],
  rows: [
    new TableRow({
      children: ['SEO', 'GEO', 'AEO'].map((label, i) => {
        const n = [scores.seo, scores.geo, scores.aeo][i];
        return multiCell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: label, font: 'Arial', size: 20, bold: true, color: C.white })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [new TextRun({ text: String(n), font: 'Arial', size: 72, bold: true, color: C.white })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: statusWord(n), font: 'Arial', size: 18, italics: true, color: C.white })],
            }),
          ],
          { width: 3120, fill: scoreColor(n), borders: noBorders, padT: 200, padB: 200 }
        );
      }),
    }),
  ],
});

const execScores = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1800, 1400, 1800, 4360],
  rows: [
    new TableRow({
      children: [
        cell('Dimension', { width: 1800, bold: true, fill: C.navy, color: C.white }),
        cell('Score', { width: 1400, bold: true, fill: C.navy, color: C.white, align: AlignmentType.CENTER }),
        cell('Status', { width: 1800, bold: true, fill: C.navy, color: C.white, align: AlignmentType.CENTER }),
        cell('Key Takeaway', { width: 4360, bold: true, fill: C.navy, color: C.white }),
      ],
    }),
    ...[
      ['SEO', scores.seo, 'Homepage SSR is empty; no sitemap/robots/OG/schema.'],
      ['GEO', scores.geo, 'About/contact help trust, but entity schema and citeable facts are missing.'],
      ['AEO', scores.aeo, 'How-it-works steps help, but no FAQ/HowTo markup or question headings.'],
    ].map(([dim, n, take], i) => new TableRow({
      children: [
        cell(dim, { width: 1800, bold: true, fill: i % 2 ? C.lightGray : C.white }),
        cell(`${n}/10`, { width: 1400, bold: true, fill: scoreColor(n), color: C.white, align: AlignmentType.CENTER }),
        cell(statusWord(n), { width: 1800, fill: i % 2 ? C.lightGray : C.white, align: AlignmentType.CENTER }),
        cell(take, { width: 4360, fill: i % 2 ? C.lightGray : C.white, size: 18 }),
      ],
    })),
    new TableRow({
      children: [
        cell('Combined', { width: 1800, bold: true, fill: C.navy, color: C.white }),
        cell(`${combined}/30`, { width: 1400, bold: true, fill: C.navy, color: C.white, align: AlignmentType.CENTER }),
        cell('', { width: 1800, fill: C.navy, color: C.white }),
        cell('Critical crawlability and structured-data gaps block search and AI visibility.', { width: 4360, fill: C.navy, color: C.white, size: 18 }),
      ],
    }),
  ],
});

const pagesRows = [
  ['https://scholar-bridge-ai.vercel.app/', 'Homepage', '200 OK but ~1 indexable word in HTML — client-only Landing'],
  ['https://scholar-bridge-ai.vercel.app/about', 'About', 'SSR content + H1; thin E-E-A-T (no team/credentials)'],
  ['https://scholar-bridge-ai.vercel.app/how-it-works', 'How it works', 'SSR steps + H1; strong AEO list potential, no HowTo schema'],
  ['https://scholar-bridge-ai.vercel.app/contact', 'Contact', 'Client page; inherits root title/description; email present'],
  ['https://scholar-bridge-ai.vercel.app/privacy', 'Privacy', 'SSR legal page (skipped for signal depth per rubric)'],
  ['https://scholar-bridge-ai.vercel.app/terms', 'Terms', 'SSR legal page (skipped for signal depth per rubric)'],
  ['https://scholar-bridge-ai.vercel.app/robots.txt', 'robots.txt', '404 — does not exist'],
  ['https://scholar-bridge-ai.vercel.app/sitemap.xml', 'Sitemap', '404 — does not exist'],
  ['/blog, /faq, /team, /pricing', 'Missing pages', 'All return 404'],
];

const pagesTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [4200, 1800, 3360],
  rows: [
    new TableRow({
      children: [
        cell('URL', { width: 4200, bold: true, fill: C.navy, color: C.white }),
        cell('Page Type', { width: 1800, bold: true, fill: C.navy, color: C.white }),
        cell('Notes', { width: 3360, bold: true, fill: C.navy, color: C.white }),
      ],
    }),
    ...pagesRows.map((r, i) => new TableRow({
      children: [
        cell(r[0], { width: 4200, fill: i % 2 ? C.lightGray : C.white, size: 16 }),
        cell(r[1], { width: 1800, fill: i % 2 ? C.lightGray : C.white, size: 18 }),
        cell(r[2], { width: 3360, fill: i % 2 ? C.lightGray : C.white, size: 16 }),
      ],
    })),
  ],
});

const seoTech = signalTable([
  { signal: 'Title tag', finding: 'Root title is "ScholarBridge AI" (16 chars). No primary keyword phrase like "professor outreach" or "research email". Contact inherits the same root title.', status: 'warn' },
  { signal: 'Meta description', finding: 'Present: "AI-personalized professor outreach — research, draft, schedule, send." (~70 chars). Under optimal 150–160; Contact has no page-specific description.', status: 'warn' },
  { signal: 'Heading hierarchy', finding: 'About H1: "Built for outreach that respects research". How-it-works H1: "From search to sent — in five clear steps". Homepage has no H1 in crawled HTML.', status: 'bad' },
  { signal: 'URL structure', finding: 'Clean paths: /about, /how-it-works, /contact. Readable and keyword-relevant.', status: 'good' },
  { signal: 'Canonical tag', finding: 'No rel=canonical on any fetched page.', status: 'bad' },
  { signal: 'Robots meta / robots.txt', finding: 'No accidental noindex on live pages. robots.txt returns 404 (Next default 404 includes noindex on that error page only).', status: 'bad' },
  { signal: 'Viewport / mobile', finding: 'viewport meta present sitewide.', status: 'good' },
  { signal: 'Open Graph / Twitter', finding: 'No og:title, og:description, og:image, or twitter:card on any page.', status: 'bad' },
  { signal: 'Internal links', finding: 'Nav/footer link Features, How it works, About, Contact, Privacy, Terms. Solid marketing IA for a small site.', status: 'good' },
  { signal: 'Sitemap', finding: 'sitemap.xml returns 404. No XML sitemap discovered.', status: 'bad' },
]);

const seoContent = signalTable([
  { signal: 'Homepage content', finding: 'Fetched HTML ≈6.5KB with ~1 indexable word. app/page.tsx is "use client"; Landing renders after auth check — crawlers/AI see an empty shell.', status: 'bad' },
  { signal: 'Word count (inner)', finding: 'About ~187 words SSR; How-it-works ~230; Contact ~80. Below 500-word depth for pillar pages.', status: 'warn' },
  { signal: 'Keyword signals', finding: 'Clear topics: professor outreach, Gmail send, research personalization. Brand entity consistent as ScholarBridge AI.', status: 'good' },
  { signal: 'Freshness', finding: 'No visible publication or update dates on marketing pages.', status: 'warn' },
  { signal: 'Readability', finding: 'About and How-it-works use clear H2s, short paragraphs, and lists — scannable when SSR works.', status: 'good' },
]);

const seoSchema = signalTable([
  { signal: 'JSON-LD / microdata', finding: 'Zero schema.org markup across all crawled pages (confirmed in HTML and codebase search).', status: 'bad' },
  { signal: 'Schema types', finding: 'Missing Organization, WebSite, SoftwareApplication, HowTo, FAQPage, BreadcrumbList, ContactPoint.', status: 'bad' },
]);

const geoEEAT = signalTable([
  { signal: 'Author information', finding: 'No named authors with credentials on marketing pages. Contact email is alijaved.developer@gmail.com (personal Gmail — weak brand entity signal).', status: 'warn' },
  { signal: 'About page', finding: 'Exists at /about with mission, beliefs, and audience. Explains the product but not founder credentials, affiliations, or track record.', status: 'warn' },
  { signal: 'Contact information', finding: 'Email + contact form at /contact. No phone, physical address, or NAP for local. Response expectation stated (1–2 business days).', status: 'good' },
  { signal: 'Trust signals', finding: 'No testimonials, awards, certifications, press mentions, or case studies. /team returns 404.', status: 'bad' },
  { signal: 'Organization schema', finding: 'Brand named in copy/footer but no Organization JSON-LD with logo, url, sameAs.', status: 'bad' },
]);

const geoAI = signalTable([
  { signal: 'Factual density', finding: 'Almost no citeable stats, dates, or unique datasets. Dashboard mock shows illustrative numbers (128/42/19) — not real claims AI should cite.', status: 'bad' },
  { signal: 'Clear claims', finding: 'Value prop is clear when content loads: research-aware professor search + personalized Gmail outreach. Invisible on homepage to non-JS agents.', status: 'warn' },
  { signal: 'Source citation', finding: 'No external authoritative citations or research references in marketing copy.', status: 'bad' },
  { signal: 'Comprehensiveness', finding: 'How-it-works covers the funnel well in five steps. Missing FAQ, comparisons, and deep guides leave common questions unanswered.', status: 'warn' },
  { signal: 'Entity clarity', finding: '“ScholarBridge AI” used consistently in titles, footer, and about copy — good brand entity string.', status: 'good' },
  { signal: 'Originality', finding: 'Clear POV (“specificity beats volume”) but no original research or proprietary public data AI engines prefer to cite.', status: 'warn' },
]);

const geoTech = signalTable([
  { signal: 'Structured data depth', finding: 'No Author, Dataset, ClaimReview, or SpeakableSpecification.', status: 'bad' },
  { signal: 'HTTPS / security', finding: 'Served over HTTPS via Vercel; HSTS present (max-age=63072000; includeSubDomains; preload).', status: 'good' },
  { signal: 'Crawlability', finding: 'No robots.txt Allow rules. Homepage heavily JS-dependent. Marketing pages partially SSR. AI crawlers that skip JS will miss the primary pitch.', status: 'bad' },
  { signal: 'sameAs / social', finding: 'No social profile links observed in nav/footer for LinkedIn/X/GitHub entity graph.', status: 'bad' },
]);

const aeoSnippet = signalTable([
  { signal: 'Direct answer paragraphs', finding: 'About lead answers “what is this” in ~35 words but not under a question heading. Homepage answer absent in HTML.', status: 'warn' },
  { signal: 'Definition patterns', finding: 'No clear “ScholarBridge AI is…” definition sentence optimized for featured snippets.', status: 'bad' },
  { signal: 'List content', finding: 'How-it-works uses an ordered 5-step list — strong list-snippet candidate if crawlable and marked up.', status: 'good' },
  { signal: 'Table content', finding: 'No comparison tables (e.g., manual outreach vs ScholarBridge).', status: 'bad' },
]);

const aeoStructured = signalTable([
  { signal: 'FAQ schema', finding: '/faq returns 404. No FAQPage JSON-LD anywhere.', status: 'bad' },
  { signal: 'HowTo schema', finding: 'Five-step process exists in UI copy but has no HowTo markup.', status: 'bad' },
  { signal: 'Question headings', finding: 'H2s are statement-style (“Our mission”, “Sign in with Google”) not “How do I…?” / “What is…?”.', status: 'warn' },
  { signal: 'Speakable schema', finding: 'No SpeakableSpecification.', status: 'bad' },
]);

const aeoVoice = signalTable([
  { signal: 'Conversational language', finding: 'Copy is natural and human (“outreach that feels human at scale”) — good for voice once crawlable.', status: 'good' },
  { signal: 'Long-tail questions', finding: 'Site does not explicitly answer who/what/when/where/why/how queries common to grad applicants.', status: 'bad' },
  { signal: 'Local signals', finding: 'Not a local-business product; NAP N/A. Email-only contact is fine for SaaS.', status: 'good' },
]);

const recs = [
  ['Critical', 'Server-render the homepage Landing (or add a static SSR marketing shell) so crawlers see H1, hero, and features without JS.', 'SEO/GEO', 'Medium', 'Critical'],
  ['Critical', 'Add app/robots.ts and app/sitemap.ts covering /, /about, /how-it-works, /contact (exclude app-only routes).', 'SEO', 'Low', 'High'],
  ['Critical', 'Add Organization + WebSite + SoftwareApplication JSON-LD; add HowTo on /how-it-works.', 'GEO/AEO', 'Low', 'High'],
  ['High', 'Add Open Graph + Twitter Card metadata with a dedicated OG image; unique title/description per page including Contact.', 'SEO', 'Low', 'High'],
  ['High', 'Publish an FAQ page with question headings + FAQPage schema targeting “how to email professors”, “AI professor outreach”, etc.', 'AEO/GEO', 'Medium', 'High'],
  ['High', 'Expand About with founder bio, credentials, and brand email; add sameAs social links.', 'GEO', 'Medium', 'Medium'],
  ['Medium', 'Add rel=canonical and richer title templates (e.g., “AI Professor Outreach | ScholarBridge AI”).', 'SEO', 'Low', 'Medium'],
  ['Quick Win', 'Add a one-sentence definition block near the top of About and homepage: “ScholarBridge AI is…”.', 'AEO', 'Low', 'Medium'],
];

const priorityFill = {
  Critical: C.red,
  High: C.orange,
  Medium: C.amber,
  'Quick Win': C.green,
};

const recTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1400, 4200, 1400, 1180, 1180],
  rows: [
    new TableRow({
      children: [
        cell('Priority', { width: 1400, bold: true, fill: C.navy, color: C.white }),
        cell('Issue', { width: 4200, bold: true, fill: C.navy, color: C.white }),
        cell('Dimension', { width: 1400, bold: true, fill: C.navy, color: C.white }),
        cell('Effort', { width: 1180, bold: true, fill: C.navy, color: C.white }),
        cell('Impact', { width: 1180, bold: true, fill: C.navy, color: C.white }),
      ],
    }),
    ...recs.map((r, i) => new TableRow({
      children: [
        cell(r[0], { width: 1400, bold: true, fill: priorityFill[r[0]], color: C.white, size: 16, align: AlignmentType.CENTER }),
        cell(r[1], { width: 4200, fill: i % 2 ? C.lightGray : C.white, size: 16 }),
        cell(r[2], { width: 1400, fill: i % 2 ? C.lightGray : C.white, size: 16 }),
        cell(r[3], { width: 1180, fill: i % 2 ? C.lightGray : C.white, size: 16, align: AlignmentType.CENTER }),
        cell(r[4], { width: 1180, fill: i % 2 ? C.lightGray : C.white, size: 16, align: AlignmentType.CENTER }),
      ],
    })),
  ],
});

const strengths = [
  'Clean URL structure and focused marketing IA (About, How it works, Contact).',
  'HTTPS + HSTS correctly configured on Vercel.',
  'About and How-it-works pages have real SSR content with singular H1s and scannable sections.',
  'Product positioning is clear in copy: research-aware professor search + Gmail-native sending.',
  'How-it-works five-step list is inherently AEO-friendly once marked up and crawlable.',
  'Contact path exists with mailto + form; response SLA stated.',
];

const strengthsTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CONTENT_W],
  rows: strengths.map((s) => new TableRow({
    children: [cell('•  ' + s, { width: CONTENT_W, fill: C.lightGreen, size: 20 })],
  })),
});

const summaryBox = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CONTENT_W],
  rows: [
    new TableRow({
      children: [
        multiCell(
          [
            p(
              'ScholarBridge AI has a clear product story and a small set of well-structured marketing pages, but it is largely invisible to traditional and AI search today. The homepage at scholar-bridge-ai.vercel.app returns HTTP 200 yet ships almost no indexable HTML because the Landing experience is client-rendered after an auth check — crawlers and many AI agents see an empty shell. There is no robots.txt, no sitemap.xml, and no schema, Open Graph, or canonical tags anywhere.',
              { size: 22, after: 120 }
            ),
            p(
              'The most urgent fix is server-rendering (or statically exposing) the homepage pitch with a real H1 and feature copy, then publishing crawl directives and structured data. The biggest near-term opportunity is turning the existing five-step How it works narrative into HowTo + FAQ markup so answer engines and AI overviews can cite ScholarBridge directly.',
              { size: 22, after: 40 }
            ),
          ],
          { width: CONTENT_W, fill: C.lightBlue, borders: thinBorders, padT: 160, padB: 160 }
        ),
      ],
    }),
  ],
});

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [{ id: 'Normal', run: { font: 'Arial', size: 22, color: C.dark } }],
      },
    },
  },
  sections: [
    // Cover
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: [
        new Paragraph({
          spacing: { before: 1800, after: 200 },
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.CLEAR, fill: C.navy },
          children: [new TextRun({ text: '', font: 'Arial', size: 2 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: DOMAIN, font: 'Arial', size: 72, bold: true, color: C.white })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: 'SEO / GEO / AEO Audit Report', font: 'Arial', size: 36, color: C.softBlue })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: AUDIT_TYPE, font: 'Arial', size: 22, color: C.white })],
        }),
        coverScoreTable,
        new Paragraph({
          spacing: { before: 1800, after: 80 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Audit date: ${DATE}`, font: 'Arial', size: 18, color: C.gray })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Claude Skill and Plugin by Alex Labat', font: 'Arial', size: 18, color: C.gray })],
        }),
        // Force navy look via full-page table behind isn't trivial; use page break
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // Body
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.navy, space: 8 } },
              spacing: { after: 120 },
              children: [
                new TextRun({ text: DOMAIN, font: 'Arial', size: 18, color: C.dark }),
                new TextRun({ text: '\t', font: 'Arial', size: 18 }),
                new TextRun({ text: 'SEO / GEO / AEO Audit Report', font: 'Arial', size: 18, color: C.gray }),
              ],
              tabStops: [{ type: 'right', position: CONTENT_W }],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 8 } },
              spacing: { before: 80 },
              children: [
                new TextRun({ text: 'Claude Skill and Plugin by Alex Labat', font: 'Arial', size: 16, color: C.gray }),
                new TextRun({ text: '\t', font: 'Arial', size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: C.gray }),
              ],
              tabStops: [{ type: 'right', position: CONTENT_W }],
            }),
          ],
        }),
      },
      children: [
        heading1('Executive Summary'),
        summaryBox,
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        execScores,

        heading1('Pages Audited'),
        p('Full audit crawl of scholar-bridge-ai.vercel.app on 2026-08-08. Live HTTP fetches plus confirmation against the Next.js app routes.', { after: 160 }),
        pagesTable,

        heading1('SEO Analysis'),
        p(`Score: ${scores.seo}/10 — ${statusWord(scores.seo)}`, { bold: true, color: scoreColor(scores.seo), after: 160 }),
        heading2('Technical On-Page'),
        seoTech,
        heading2('Content Quality'),
        seoContent,
        heading2('Structured Data'),
        seoSchema,

        heading1('GEO Analysis'),
        p(`Score: ${scores.geo}/10 — ${statusWord(scores.geo)}`, { bold: true, color: scoreColor(scores.geo), after: 160 }),
        p('GEO (Generative Engine Optimization) targets AI-powered answer engines such as Perplexity, ChatGPT Search, Google AI Overviews, and Gemini — systems that synthesize answers and cite sources.', { italics: true, size: 20, after: 160 }),
        heading2('E-E-A-T Assessment'),
        geoEEAT,
        heading2('Content for AI Synthesis'),
        geoAI,
        heading2('Technical GEO'),
        geoTech,

        heading1('AEO Analysis'),
        p(`Score: ${scores.aeo}/10 — ${statusWord(scores.aeo)}`, { bold: true, color: scoreColor(scores.aeo), after: 160 }),
        p('AEO (Answer Engine Optimization) targets featured snippets, People Also Ask, and voice answers that need a concise extractable response.', { italics: true, size: 20, after: 160 }),
        heading2('Featured Snippet Eligibility'),
        aeoSnippet,
        heading2('Structured Answer Formats'),
        aeoStructured,
        heading2('Voice Search Readiness'),
        aeoVoice,

        heading1('Priority Recommendations'),
        recTable,

        heading1("What's Working Well"),
        strengthsTable,

        heading1('Glossary'),
        heading2('SEO'),
        p('Search Engine Optimization — improving technical, on-page, and content signals so traditional search engines can discover, understand, and rank pages.'),
        heading2('GEO'),
        p('Generative Engine Optimization — making content clear, authoritative, and fact-rich so AI search systems can confidently cite it in synthesized answers.'),
        heading2('AEO'),
        p('Answer Engine Optimization — structuring content (definitions, lists, FAQs, schema) so engines can extract direct answers for snippets and voice queries.'),

        new Paragraph({
          spacing: { before: 400 },
          children: [new TextRun({ text: 'Limits of this audit: Core Web Vitals, JS-rendered visual QA, backlink profile, and domain authority were not measured. Use Google PageSpeed Insights (pagespeed.web.dev) for CWV.', font: 'Arial', size: 18, italics: true, color: C.gray })],
        }),
      ],
    },
  ],
});

// Cover section needs navy background - wrap cover content in a full-width shaded approach
// Re-build cover as a single navy-shaded cell for reliable look
const coverDoc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      },
      children: [
        new Table({
          width: { size: PAGE_W, type: WidthType.DXA },
          columnWidths: [PAGE_W],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: PAGE_W, type: WidthType.DXA },
                  borders: noBorders,
                  shading: { type: ShadingType.CLEAR, fill: C.navy },
                  margins: { top: 0, bottom: 0, left: MARGIN, right: MARGIN },
                  children: [
                    new Paragraph({ spacing: { before: 2800, after: 200 }, children: [] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 200 },
                      children: [new TextRun({ text: DOMAIN, font: 'Arial', size: 72, bold: true, color: C.white })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 200 },
                      children: [new TextRun({ text: 'SEO / GEO / AEO Audit Report', font: 'Arial', size: 36, color: C.softBlue })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 400 },
                      children: [new TextRun({ text: AUDIT_TYPE, font: 'Arial', size: 22, color: C.white })],
                    }),
                    new Table({
                      width: { size: CONTENT_W, type: WidthType.DXA },
                      columnWidths: [3120, 3120, 3120],
                      rows: [
                        new TableRow({
                          children: ['SEO', 'GEO', 'AEO'].map((label, i) => {
                            const n = [scores.seo, scores.geo, scores.aeo][i];
                            return multiCell(
                              [
                                new Paragraph({
                                  alignment: AlignmentType.CENTER,
                                  children: [new TextRun({ text: label, font: 'Arial', size: 20, bold: true, color: C.white })],
                                }),
                                new Paragraph({
                                  alignment: AlignmentType.CENTER,
                                  spacing: { before: 60, after: 60 },
                                  children: [new TextRun({ text: String(n), font: 'Arial', size: 72, bold: true, color: C.white })],
                                }),
                                new Paragraph({
                                  alignment: AlignmentType.CENTER,
                                  children: [new TextRun({ text: statusWord(n), font: 'Arial', size: 18, italics: true, color: C.white })],
                                }),
                              ],
                              { width: 3120, fill: scoreColor(n), borders: noBorders, padT: 200, padB: 200 }
                            );
                          }),
                        }),
                      ],
                    }),
                    new Paragraph({ spacing: { before: 2200 }, children: [] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 80 },
                      children: [new TextRun({ text: `Audit date: ${DATE}`, font: 'Arial', size: 18, color: C.gray })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 2400 },
                      children: [new TextRun({ text: 'Claude Skill and Plugin by Alex Labat', font: 'Arial', size: 18, color: C.gray })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),
        heading1('Executive Summary'),
        summaryBox,
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        execScores,
        heading1('Pages Audited'),
        p('Full audit crawl of scholar-bridge-ai.vercel.app on 2026-08-08. Live HTTP fetches confirmed against Next.js routes.', { after: 160 }),
        pagesTable,
        heading1('SEO Analysis'),
        p(`Score: ${scores.seo}/10 — ${statusWord(scores.seo)}`, { bold: true, color: scoreColor(scores.seo), after: 160 }),
        heading2('Technical On-Page'),
        seoTech,
        heading2('Content Quality'),
        seoContent,
        heading2('Structured Data'),
        seoSchema,
        heading1('GEO Analysis'),
        p(`Score: ${scores.geo}/10 — ${statusWord(scores.geo)}`, { bold: true, color: scoreColor(scores.geo), after: 160 }),
        p('GEO optimizes for AI-powered search (Perplexity, ChatGPT Search, Google AI Overviews, Gemini) that synthesize answers and cite sources.', { italics: true, size: 20, after: 160 }),
        heading2('E-E-A-T Assessment'),
        geoEEAT,
        heading2('Content for AI Synthesis'),
        geoAI,
        heading2('Technical GEO'),
        geoTech,
        heading1('AEO Analysis'),
        p(`Score: ${scores.aeo}/10 — ${statusWord(scores.aeo)}`, { bold: true, color: scoreColor(scores.aeo), after: 160 }),
        p('AEO optimizes for featured snippets, People Also Ask, and voice answers that need a concise extractable response.', { italics: true, size: 20, after: 160 }),
        heading2('Featured Snippet Eligibility'),
        aeoSnippet,
        heading2('Structured Answer Formats'),
        aeoStructured,
        heading2('Voice Search Readiness'),
        aeoVoice,
        heading1('Priority Recommendations'),
        recTable,
        heading1("What's Working Well"),
        strengthsTable,
        heading1('Glossary'),
        heading2('SEO'),
        p('Search Engine Optimization — improving technical, on-page, and content signals so traditional search engines can discover, understand, and rank pages.'),
        heading2('GEO'),
        p('Generative Engine Optimization — making content clear, authoritative, and fact-rich so AI search systems can confidently cite it in synthesized answers.'),
        heading2('AEO'),
        p('Answer Engine Optimization — structuring content (definitions, lists, FAQs, schema) so engines can extract direct answers for snippets and voice queries.'),
        new Paragraph({
          spacing: { before: 400 },
          children: [new TextRun({ text: 'Limits of this audit: Core Web Vitals, full JS visual QA, backlinks, and domain authority were not measured. Use pagespeed.web.dev for CWV.', font: 'Arial', size: 18, italics: true, color: C.gray })],
        }),
      ],
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.navy, space: 8 } },
              spacing: { after: 120 },
              tabStops: [{ type: 'right', position: CONTENT_W }],
              children: [
                new TextRun({ text: DOMAIN, font: 'Arial', size: 18, color: C.dark }),
                new TextRun({ text: '\t' }),
                new TextRun({ text: 'SEO / GEO / AEO Audit Report', font: 'Arial', size: 18, color: C.gray }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 8 } },
              spacing: { before: 80 },
              tabStops: [{ type: 'right', position: CONTENT_W }],
              children: [
                new TextRun({ text: 'Claude Skill and Plugin by Alex Labat', font: 'Arial', size: 16, color: C.gray }),
                new TextRun({ text: '\t' }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: C.gray }),
              ],
            }),
          ],
        }),
      },
    },
  ],
});

const outDir = path.join(process.cwd(), 'outputs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `seo-audit-scholar-bridge-ai-vercel-app-${DATE}.docx`);

Packer.toBuffer(coverDoc).then((buffer) => {
  fs.writeFileSync(outFile, buffer);
  console.log('DOCX written:', outFile);
  console.log('SIZE:', buffer.length);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
