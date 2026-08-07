import MarketingShell from "@/components/MarketingShell";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";
import { SITE_EMAIL } from "@/lib/site";
import { breadcrumbSchema, personSchema, speakableSchema } from "@/lib/schema";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "ScholarBridge AI is research-aware professor outreach for applicants and labs — find faculty among 30,000+ emails across 100+ countries, personalize with their work, and send from your email.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — ScholarBridge AI",
    description:
      "Why we built ScholarBridge — research-aware outreach with 30,000+ professor emails across 100+ countries.",
    url: "/about",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "ScholarBridge AI" }],
  },
};

export default function AboutPage() {
  return (
    <MarketingShell activeHref="/about">
      <JsonLd
        data={[
          breadcrumbSchema([{ name: "About", path: "/about" }]),
          personSchema(),
          speakableSchema([".speakable", ".lead", "h1"], "/about"),
        ]}
      />
      <article className="doc">
        <p className="eyebrow">About us</p>
        <p className="meta">Last updated: August 8, 2026</p>
        <h1 className="speakable">Built for outreach that respects research</h1>
        <p className="lead speakable">
          ScholarBridge AI is a research-aware outreach platform that helps students and researchers find the
          right professors, personalize every email with their work, and send from your email — without spreadsheet
          chaos. The shared cache includes more than 30,000 professor emails covering 100+ countries.
        </p>

        <h2>What is ScholarBridge AI?</h2>
        <p className="speakable">
          ScholarBridge AI is software for academic outreach: search labs by country, university, and field; draft
          messages grounded in each professor&apos;s recent papers; organize targets into buckets; then schedule and
          send from your own inbox. It is built for applicants and researchers who want specificity instead of mass
          templates.
        </p>

        <h2>Our mission</h2>
        <p>
          Academic outreach should feel human. Mass templates ignore a professor&apos;s papers; endless
          manual research burns weeks. We bridge that gap with search, AI drafts grounded in recent work,
          and scheduling that runs from your own inbox so replies land where you expect them.
        </p>

        <h2>How does ScholarBridge compare to manual outreach?</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Manual spreadsheets</th>
                <th>ScholarBridge AI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Find professors</td>
                <td>Hours of Google and department pages</td>
                <td>Search by country, university, and field</td>
              </tr>
              <tr>
                <td>Get emails</td>
                <td>Guess, scrape, or skip</td>
                <td>30,000+ cached emails from open-access papers</td>
              </tr>
              <tr>
                <td>Personalize</td>
                <td>Read papers one by one</td>
                <td>AI drafts grounded in recent work</td>
              </tr>
              <tr>
                <td>Send &amp; track</td>
                <td>Copy-paste into inbox</td>
                <td>Schedule and send from your email</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>What we believe</h2>
        <ul>
          <li>
            <strong>Specificity beats volume.</strong> One thoughtful note outperforms a hundred generic blasts.
          </li>
          <li>
            <strong>You own the relationship.</strong> Messages send from your email so replies land where you
            expect them.
          </li>
          <li>
            <strong>Clarity over clutter.</strong> Find labs, draft, schedule, track — in one workspace.
          </li>
          <li>
            <strong>Open data, careful use.</strong> Email mining draws on open-access papers and public scholarly
            signals — not private inboxes.
          </li>
        </ul>

        <h2>Where do the 30,000+ emails come from?</h2>
        <p>
          The email-mining cache grows as open-access papers are processed country by country. Each stored contact
          can be filtered by university and research field so you spend time writing, not hunting addresses. Counts
          change as the crawl continues; the product surfaces what is currently available in the cache.
        </p>

        <h2>Who it&apos;s for</h2>
        <p>
          Graduate applicants, postdocs, and research teams who need to reach faculty and collaborators with
          personalized, research-aware messages — at a pace that still feels personal. If you are comparing labs
          across 100+ countries or building a multi-week campaign, ScholarBridge is designed for that workflow.
        </p>

        <h2>Who&apos;s behind it</h2>
        <p>
          ScholarBridge AI is built by Ali Javed, a developer focused on research tooling and practical outreach
          workflows. The product connects your email for sending so you remain the sender of record, with AI
          assistance that stays editable before anything goes out.
        </p>

        <h2>Learn more</h2>
        <p>
          See <Link href="/how-it-works">how it works</Link>, browse the <Link href="/faq">FAQ</Link>, or{" "}
          <Link href="/contact">contact us</Link>. Questions or feedback? Write to{" "}
          <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>.
        </p>
      </article>

      <style>{`
        .doc .eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--acc);
          margin: 0 0 8px;
        }
        .doc .meta {
          font-size: 12px;
          color: var(--mut);
          margin: 0 0 14px;
        }
        .doc h1 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 14px;
          line-height: 1.15;
        }
        .doc .lead {
          font-size: 17px;
          line-height: 1.6;
          color: var(--mut);
          margin: 0 0 36px;
        }
        .doc h2 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          margin: 28px 0 10px;
        }
        .doc p, .doc li {
          font-size: 15px;
          line-height: 1.65;
          color: var(--mut);
          margin: 0 0 12px;
        }
        .doc ul {
          margin: 0 0 12px;
          padding-left: 1.2em;
        }
        .doc strong {
          color: var(--ink);
        }
        .doc a {
          color: var(--acc2);
        }
        .table-wrap {
          overflow-x: auto;
          margin: 12px 0 24px;
          border: 1px solid var(--line);
          border-radius: 14px;
        }
        .doc table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .doc th, .doc td {
          text-align: left;
          padding: 12px 14px;
          border-bottom: 1px solid var(--line);
          color: var(--mut);
          vertical-align: top;
        }
        .doc th {
          background: color-mix(in srgb, var(--card) 80%, var(--acc));
          color: var(--ink);
          font-weight: 700;
        }
        .doc tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </MarketingShell>
  );
}
