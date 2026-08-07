import MarketingShell from "@/components/MarketingShell";
import type { Metadata } from "next";
import { SITE_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "ScholarBridge AI is research-aware professor outreach for applicants and labs — find faculty, personalize emails with their work, and send from Gmail.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — ScholarBridge AI",
    description:
      "Why we built ScholarBridge — research-aware outreach for applicants and labs.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <MarketingShell activeHref="/about">
      <article className="doc">
        <p className="eyebrow">About us</p>
        <h1>Built for outreach that respects research</h1>
        <p className="lead">
          ScholarBridge AI is a research-aware outreach platform that helps students and researchers find the
          right professors, personalize every email with their work, and send from Gmail — without spreadsheet
          chaos.
        </p>

        <h2>Our mission</h2>
        <p>
          Academic outreach should feel human. Mass templates ignore a professor&apos;s papers; endless
          manual research burns weeks. We bridge that gap with search, AI drafts grounded in recent work,
          and scheduling that runs from your own inbox.
        </p>

        <h2>What we believe</h2>
        <ul>
          <li>
            <strong>Specificity beats volume.</strong> One thoughtful note outperforms a hundred generic blasts.
          </li>
          <li>
            <strong>You own the relationship.</strong> Messages send from your Gmail so replies land where you
            expect them.
          </li>
          <li>
            <strong>Clarity over clutter.</strong> Find labs, draft, schedule, track — in one workspace.
          </li>
        </ul>

        <h2>Who it&apos;s for</h2>
        <p>
          Graduate applicants, postdocs, and research teams who need to reach faculty and collaborators with
          personalized, research-aware messages — at a pace that still feels personal.
        </p>

        <h2>Who&apos;s behind it</h2>
        <p>
          ScholarBridge AI is built by Ali Javed. For product questions, partnerships, or feedback, write to{" "}
          <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a> or use the <a href="/contact">contact form</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions or feedback? Write us at{" "}
          <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>
          {" "}or use the <a href="/contact">contact form</a>.
        </p>
      </article>

      <style>{`
        .doc .eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--acc);
          margin: 0 0 12px;
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
      `}</style>
    </MarketingShell>
  );
}
