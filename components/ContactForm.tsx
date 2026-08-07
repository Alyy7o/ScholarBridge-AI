"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, company }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.detail || "Could not send message.");
      setStatus({ kind: "ok", text: "Message sent — we’ll get back to you soon." });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      setStatus({ kind: "err", text: (err as Error)?.message || "Something went wrong." });
    }
    setBusy(false);
  };

  return (
    <div className="ct">
      <div className="ct-copy">
        <p className="eyebrow">Contact</p>
        <p className="meta">Last updated: August 8, 2026</p>
        <h1>Get in touch</h1>
        <p className="lead speakable">
          Questions about ScholarBridge AI, partnerships, press, or support — send a note and it goes straight to
          our inbox. We help applicants and labs with research-aware professor outreach, the 30,000+ email cache,
          and sending campaigns from your email.
        </p>
        <ul className="ct-meta">
          <li>
            <span>Email</span>
            <a href="mailto:alijaved.developer@gmail.com">alijaved.developer@gmail.com</a>
          </li>
          <li>
            <span>Response</span>
            <em>Usually within 1–2 business days</em>
          </li>
          <li>
            <span>Best for</span>
            <em>Product questions, partnerships, bug reports, data questions</em>
          </li>
        </ul>
        <div className="ct-topics">
          <h2>What can we help with?</h2>
          <ul>
            <li>
              <strong>Product &amp; onboarding</strong> — how search, buckets, AI drafts, and scheduling work.
            </li>
            <li>
              <strong>Email cache</strong> — coverage across 100+ countries and how open-access mining grows the list.
            </li>
            <li>
              <strong>Partnerships</strong> — universities, labs, or tools that want to collaborate.
            </li>
            <li>
              <strong>Account &amp; sending</strong> — connecting your email and campaign delivery questions.
            </li>
          </ul>
          <p>
            Prefer self-serve answers first? See the <a href="/faq">FAQ</a> and{" "}
            <a href="/how-it-works">how it works</a>.
          </p>
        </div>
      </div>

      <form className="ct-form" onSubmit={submit} noValidate>
        <label className="hp" aria-hidden="true">
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>

        <label>
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            maxLength={200}
          />
        </label>
        <label>
          Subject
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="How can we help?"
            maxLength={160}
          />
        </label>
        <label>
          Message
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us a bit more…"
            rows={7}
            maxLength={5000}
          />
        </label>

        {status && <p className={`ct-status ${status.kind}`}>{status.text}</p>}

        <button type="submit" className="ct-submit" disabled={busy}>
          {busy ? "Sending…" : "Send message"}
        </button>
      </form>

      <style jsx>{`
        .ct {
          display: grid;
          gap: 40px;
          align-items: start;
        }
        @media (min-width: 900px) {
          .ct {
            grid-template-columns: 1fr 1.15fr;
            gap: 56px;
            padding-top: 12px;
          }
        }
        .eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--acc);
          margin: 0 0 8px;
        }
        .meta {
          font-size: 12px;
          color: var(--mut);
          margin: 0 0 14px;
        }
        h1 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(32px, 4vw, 44px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 14px;
          line-height: 1.12;
        }
        .lead {
          margin: 0 0 28px;
          font-size: 16px;
          line-height: 1.6;
          color: var(--mut);
          max-width: 46ch;
        }
        .ct-topics {
          margin-top: 8px;
        }
        .ct-topics h2 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 10px;
          color: var(--ink);
        }
        .ct-topics ul {
          margin: 0 0 14px;
          padding-left: 1.15em;
          color: var(--mut);
          font-size: 14px;
          line-height: 1.55;
        }
        .ct-topics li {
          margin-bottom: 8px;
        }
        .ct-topics strong {
          color: var(--ink);
        }
        .ct-topics p {
          margin: 0;
          font-size: 14px;
          color: var(--mut);
          line-height: 1.55;
        }
        .ct-topics a {
          color: var(--acc2);
        }
        .ct-meta {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ct-meta li {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ct-meta span {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--mut);
        }
        .ct-meta a,
        .ct-meta em {
          font-style: normal;
          color: var(--ink);
          font-weight: 600;
          text-decoration: none;
        }
        .ct-meta a:hover {
          color: var(--acc);
        }
        .ct-form {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ct-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--mut);
        }
        .ct-form input,
        .ct-form textarea {
          width: 100%;
          background: var(--field);
          border: 1px solid var(--line);
          color: var(--ink);
          border-radius: 10px;
          padding: 11px 12px;
          font: inherit;
          font-size: 14px;
          font-weight: 500;
          resize: vertical;
        }
        .ct-form input:focus,
        .ct-form textarea:focus {
          outline: 2px solid color-mix(in srgb, var(--acc) 45%, transparent);
          outline-offset: 1px;
          border-color: color-mix(in srgb, var(--acc) 40%, var(--line));
        }
        .hp {
          position: absolute;
          left: -9999px;
          opacity: 0;
          height: 0;
          overflow: hidden;
        }
        .ct-status {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .ct-status.ok {
          background: color-mix(in srgb, #22c55e 14%, transparent);
          color: #86efac;
        }
        .ct-status.err {
          background: color-mix(in srgb, var(--bad) 14%, transparent);
          color: #fecaca;
        }
        .ct-submit {
          margin-top: 4px;
          align-self: flex-start;
          background: linear-gradient(135deg, var(--acc), var(--acc2));
          color: var(--on-acc);
          border: none;
          border-radius: 999px;
          padding: 12px 22px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .ct-submit:disabled {
          opacity: 0.65;
          cursor: wait;
        }
      `}</style>
    </div>
  );
}
