import MarketingShell from "@/components/MarketingShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ScholarBridge AI collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <article className="doc">
        <p className="eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="meta">Last updated: August 4, 2026</p>
        <p className="lead">
          This policy explains what we collect, why we collect it, and the choices you have when using
          ScholarBridge AI.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong> — name, email, and profile details from sign-up or Google sign-in
          </li>
          <li>
            <strong>Google / Gmail</strong> — tokens needed to send mail on your behalf; we request only the
            scopes required for that purpose
          </li>
          <li>
            <strong>Outreach data</strong> — professor lists, drafts, schedules, campaign status, and related
            content you create
          </li>
          <li>
            <strong>Usage data</strong> — approximate logs such as feature use, errors, and device/browser
            type to keep the Service reliable
          </li>
        </ul>

        <h2>2. How we use information</h2>
        <ul>
          <li>Operate and improve search, drafting, scheduling, and sending</li>
          <li>Authenticate you and secure your account</li>
          <li>Provide support and respond to requests</li>
          <li>Detect abuse and enforce our Terms</li>
        </ul>
        <p>We do not sell your personal information.</p>

        <h2>3. AI processing</h2>
        <p>
          Draft generation may send relevant context (such as paper summaries you select and your instructions)
          to third-party AI providers solely to produce drafts. Avoid pasting sensitive personal data into
          prompts when it is not needed.
        </p>

        <h2>4. Sharing</h2>
        <p>We share data only with:</p>
        <ul>
          <li>Infrastructure and email providers needed to run the Service (e.g. hosting, auth, Gmail)</li>
          <li>AI providers for draft generation, as described above</li>
          <li>Authorities when required by law</li>
        </ul>

        <h2>5. Retention</h2>
        <p>
          We keep account and campaign data while your account is active and for a reasonable period afterward
          for backups, legal obligations, or dispute resolution. You may request deletion of your account data
          by contacting us.
        </p>

        <h2>6. Security</h2>
        <p>
          We use industry-standard measures to protect data in transit and at rest. No method of transmission
          or storage is 100% secure.
        </p>

        <h2>7. Your choices</h2>
        <ul>
          <li>Disconnect Google access from your Google account settings</li>
          <li>Edit or delete campaign content inside the product</li>
          <li>Request account or data deletion via email</li>
        </ul>

        <h2>8. Children</h2>
        <p>
          The Service is not directed to children under 16. We do not knowingly collect their personal
          information.
        </p>

        <h2>9. International users</h2>
        <p>
          Data may be processed in countries where we or our providers operate. By using the Service you
          understand that processing may occur outside your home country, subject to applicable safeguards.
        </p>

        <h2>10. Changes</h2>
        <p>
          We may update this policy. Material changes will be reflected by the “Last updated” date on this
          page.
        </p>

        <h2>11. Contact</h2>
        <p>
          Privacy questions: <a href="mailto:hello@scholarbridge.ai">hello@scholarbridge.ai</a>
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
