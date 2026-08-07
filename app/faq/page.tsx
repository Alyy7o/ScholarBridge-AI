import MarketingShell from "@/components/MarketingShell";
import JsonLd from "@/components/JsonLd";
import { FAQ_ITEMS } from "@/lib/faq";
import { breadcrumbSchema, faqPageSchema, speakableSchema } from "@/lib/schema";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "FAQ for ScholarBridge AI: what it is, 30,000+ professor emails across 100+ countries, research-aware drafts, sending from your email, uploads, and support.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ — ScholarBridge AI",
    description:
      "Answers about ScholarBridge AI, the 30,000+ professor email cache, sending from your email, and support.",
    url: "/faq",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "ScholarBridge AI" }],
  },
};

export default function FaqPage() {
  return (
    <MarketingShell activeHref="/faq">
      <JsonLd
        data={[
          faqPageSchema(),
          breadcrumbSchema([{ name: "FAQ", path: "/faq" }]),
          speakableSchema([".speakable", "h1", ".lead"], "/faq"),
        ]}
      />
      <article className="doc">
        <p className="eyebrow">FAQ</p>
        <p className="meta">Last updated: August 8, 2026</p>
        <h1>Frequently asked questions</h1>
        <p className="lead speakable">
          ScholarBridge AI is a research-aware outreach tool for finding professors among more than 30,000 cached
          emails across 100+ countries, drafting personalized messages, and sending campaigns from your email. Here
          are direct answers to the questions applicants and labs ask most.
        </p>

        {FAQ_ITEMS.map((item) => (
          <section key={item.question}>
            <h2>{item.question}</h2>
            <p className="speakable">{item.answer}</p>
          </section>
        ))}

        <h2>Still need help?</h2>
        <p>
          Read <Link href="/how-it-works">how it works</Link>, learn more <Link href="/about">about us</Link>, or
          write to{" "}
          <a href="mailto:alijaved.developer@gmail.com">alijaved.developer@gmail.com</a> / use the{" "}
          <Link href="/contact">contact form</Link>.
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
        .doc p {
          font-size: 15px;
          line-height: 1.65;
          color: var(--mut);
          margin: 0 0 12px;
        }
        .doc a {
          color: var(--acc2);
        }
      `}</style>
    </MarketingShell>
  );
}
