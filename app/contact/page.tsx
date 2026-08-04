"use client";

import { useState } from "react";
import MarketingShell from "@/components/MarketingShell";

export default function ContactPage() {
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
    <MarketingShell activeHref="/contact">
      <div className="ct">
        <div className="ct-copy">
          <p className="eyebrow">Contact</p>
          <h1>Get in touch</h1>
          <p className="lead">
            Questions about ScholarBridge, partnerships, or support — send a note and it goes straight to our
            inbox.
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
          </ul>
        </div>

        <form className="ct-form" onSubmit={submit} noValidate>
          {/* honeypot */}
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
      </div>

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
          margin: 0 0 12px;
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
          max-width: 42ch;
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
    </MarketingShell>
  );
}
