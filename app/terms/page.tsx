import MarketingShell from "@/components/MarketingShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — ScholarBridge AI",
  description: "Terms and conditions for using ScholarBridge AI.",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <article className="doc">
        <p className="eyebrow">Legal</p>
        <h1>Terms of Service</h1>
        <p className="meta">Last updated: August 4, 2026</p>
        <p className="lead">
          By using ScholarBridge AI (“Service”), you agree to these Terms. If you do not agree, do not use the
          Service.
        </p>

        <h2>1. The Service</h2>
        <p>
          ScholarBridge provides tools to search for academic contacts, draft personalized outreach with AI,
          schedule messages, and send them through your connected Gmail account. Features may change as we
          improve the product.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You must provide accurate account information and keep credentials secure. You are responsible for
          activity under your account. You must be old enough to form a binding contract in your jurisdiction.
        </p>

        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Send spam, harassment, or unlawful content</li>
          <li>Misrepresent your identity or affiliation</li>
          <li>Violate university, employer, or Gmail/Google policies</li>
          <li>Attempt to reverse-engineer, abuse, or disrupt the Service</li>
          <li>Scrape or resell data obtained through the Service in violation of law</li>
        </ul>

        <h2>4. Email &amp; Google</h2>
        <p>
          When you connect Google, messages are sent from your Gmail. You remain the sender and are responsible
          for content, recipients, and compliance with anti-spam and academic conduct rules. We do not send as
          ScholarBridge on your behalf.
        </p>

        <h2>5. AI-generated content</h2>
        <p>
          Drafts are suggestions. You should review and edit before sending. We do not guarantee accuracy of
          research summaries or that a draft will achieve any outcome.
        </p>

        <h2>6. Intellectual property</h2>
        <p>
          The Service, branding, and software are owned by ScholarBridge or its licensors. You retain rights to
          content you create and upload, and grant us a license to process it solely to operate the Service.
        </p>

        <h2>7. Disclaimers</h2>
        <p>
          The Service is provided “as is” without warranties of any kind. We do not guarantee uninterrupted
          access, delivery rates, or admissions/research outcomes.
        </p>

        <h2>8. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, ScholarBridge is not liable for indirect, incidental, or
          consequential damages, or for losses arising from emails you send or account misuse.
        </p>

        <h2>9. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate access for violations of
          these Terms or to protect the Service and its users.
        </p>

        <h2>10. Changes</h2>
        <p>
          We may update these Terms. Continued use after changes constitutes acceptance of the revised Terms.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions: <a href="mailto:hello@scholarbridge.ai">hello@scholarbridge.ai</a>
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
          margin: 0 0 8px;
          line-height: 1.15;
        }
        .doc .meta {
          font-size: 13px;
          color: var(--mut);
          margin: 0 0 20px;
        }
        .doc .lead {
          font-size: 16px;
          line-height: 1.6;
          color: var(--mut);
          margin: 0 0 28px;
        }
        .doc h2 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          margin: 26px 0 8px;
        }
        .doc p, .doc li {
          font-size: 15px;
          line-height: 1.65;
          color: var(--mut);
          margin: 0 0 10px;
        }
        .doc ul {
          margin: 0 0 12px;
          padding-left: 1.2em;
        }
        .doc a {
          color: var(--acc2);
        }
      `}</style>
    </MarketingShell>
  );
}
