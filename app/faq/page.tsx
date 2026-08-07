import MarketingShell from "@/components/MarketingShell";
import JsonLd from "@/components/JsonLd";
import { FAQ_ITEMS } from "@/lib/faq";
import { faqPageSchema } from "@/lib/schema";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about ScholarBridge AI: research-aware professor outreach, Gmail sending, finding labs, and support.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ — ScholarBridge AI",
    description:
      "What is ScholarBridge AI, how research-aware outreach works, Gmail sending, and how to get support.",
    url: "/faq",
  },
};

export default function FaqPage() {
  return (
    <MarketingShell activeHref="/faq">
      <JsonLd data={faqPageSchema()} />
      <article className="doc">
        <p className="eyebrow">FAQ</p>
        <h1>Frequently asked questions</h1>
        <p className="lead">
          ScholarBridge AI is a research-aware outreach tool for finding professors and sending personalized
          Gmail campaigns. Here are direct answers to the questions applicants and labs ask most.
        </p>

        {FAQ_ITEMS.map((item) => (
          <section key={item.question}>
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </section>
        ))}

        <h2>Still need help?</h2>
        <p>
          Write us at{" "}
          <a href="mailto:alijaved.developer@gmail.com">alijaved.developer@gmail.com</a> or use the{" "}
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
