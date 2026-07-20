"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || `HTTP ${r.status}`);
  return j;
}
const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return String(iso); }
};

function Loader({ page = false, label = "Loading" }: { page?: boolean; label?: string }) {
  return (
    <div className={"loader" + (page ? " page" : "")}>
      <span className="spinner" /> {label}…
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode }) {
  return (
    <label className="tgl">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tgl-track"><span className="tgl-thumb" /></span>
      {label != null ? <span className="tgl-label">{label}</span> : null}
    </label>
  );
}

function FileDrop({ file, onFile, accept, hint }: { file: File | null; onFile: (f: File | null) => void; accept?: string; hint?: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={"filedrop" + (drag ? " drag" : "")}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const dropped = e.dataTransfer.files?.[0]; if (dropped) onFile(dropped); }}
    >
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0] || null)} />
      <svg className="filedrop-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
      {file ? (
        <div>
          <div className="filedrop-name">{file.name}</div>
          <button type="button" className="filedrop-link" style={{ marginTop: 4 }} onClick={(e) => { e.stopPropagation(); onFile(null); if (inputRef.current) inputRef.current.value = ""; }}>Remove</button>
        </div>
      ) : (
        <div>
          <div className="filedrop-title">Drag and drop here</div>
          <div className="filedrop-or">or</div>
          <span className="filedrop-link">Browse files</span>
        </div>
      )}
      {hint ? <div className="filedrop-hint">{hint}</div> : null}
    </div>
  );
}

function Tips({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="tips">
      <summary><span className="tips-ic">i</span> {title} <span className="tips-chev">▼</span></summary>
      <div className="tips-body">{children}</div>
    </details>
  );
}

function EmailTester({ toast }: any) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("ScholarBridge test email");
  const [body, setBody] = useState(
    "This is a test email from ScholarBridge AI. If you received it, sending works.",
  );
  const [busy, setBusy] = useState(false);
  const [st, setStX] = useState("");
  const send = async () => {
    if (!to.includes("@")) { setStX("Enter a valid recipient email"); return; }
    setBusy(true); setStX("Sending…");
    try {
      const j = await api("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      setStX(j.dry_run ? "Dry-run: Gmail not connected (nothing sent)." : "Sent ✓");
      toast(j.dry_run ? "Dry-run (Gmail not connected)" : "Test email sent");
    } catch (e) { setStX((e as Error).message || "Failed"); }
    setBusy(false);
  };
  return (
    <div className="card">
      <b>Send a test email</b>
      <div className="mut tiny" style={{ margin: "4px 0 12px" }}>
        Sends immediately via your connected Gmail. If Gmail isn't connected it runs as a dry-run.
      </div>
      <label>To</label>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
      <label style={{ marginTop: 10 }}>Subject</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      <label style={{ marginTop: 10 }}>Body</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn sm" disabled={busy} onClick={send}>Send test</button>
        <span className="mut">{st}</span>
      </div>
    </div>
  );
}

const SECTIONS: [string, string, string][] = [
  ["dashboard", "Dashboard", "▨"], ["compose", "Compose", "✎"], ["professors", "Professors", "👤"], ["find", "Find Professors", "🔎"],
  ["templates", "Templates", "▤"], ["attachments", "Attachments", "📎"], ["history", "Schedule & History", "🗓"], ["emails", "Email cache", "📇"], ["settings", "Settings", "⚙"],
];

export default function Dashboard() {
  const [section, setSection] = useState("dashboard");
  const [toast, setToastMsg] = useState<string | null>(null);
  const [foot, setFoot] = useState("");
  const [me, setMe] = useState<{ name: string; email: string }>({ name: "", email: "" });
  const [acctOpen, setAcctOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const showToast = useCallback((m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2200); }, []);
  const signOut = async () => { await supabaseBrowser().auth.signOut(); location.reload(); };

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      const u = data.user;
      const email = u?.email || "";
      const name = (u?.user_metadata?.full_name as string) || email.split("@")[0] || "Account";
      setMe({ name, email });
    });
    try {
      const saved = localStorage.getItem("sb_theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("sb_theme", theme); } catch { /* ignore */ }
  }, [theme]);

  const props = { toast: showToast, setFoot, go: setSection };
  const Body = {
    dashboard: DashboardHome, compose: Compose, professors: Professors, find: FindProfessors,
    templates: Templates, attachments: Attachments, history: History, emails: EmailHarvest, settings: Settings,
  }[section] as React.FC<any>;

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><div className="logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 8l11 5 9-4.09V15h2V8L12 3zM5 13.18v3.5C5 18.5 8.13 20 12 20s7-1.5 7-3.32v-3.5l-7 3.18-7-3.18z" /></svg></div><div><b>ScholarBridge</b><span>AI outreach scheduler</span></div></div>
        <nav className="nav">
          {SECTIONS.map(([id, label, ic]) => (
            <button key={id} className={id === section ? "on" : ""} onClick={() => setSection(id)}><span>{ic}</span> {label}</button>
          ))}
        </nav>
        <div className="side-account">
          {acctOpen && (
            <>
              <button type="button" aria-hidden className="tpf-backdrop" onClick={() => setAcctOpen(false)} />
              <div className="side-acct-menu">
                <div className="sam-info">{me.email || "Signed in"}</div>
                <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀️  Light mode" : "🌙  Dark mode"}</button>
                <button onClick={signOut}>⎋  Sign out</button>
              </div>
            </>
          )}
          <button type="button" className="side-acct-btn" onClick={() => setAcctOpen((o) => !o)}>
            <span className="side-avatar">{(me.name || "?").slice(0, 1).toUpperCase()}</span>
            <span className="side-acct-name">{me.name || "Account"}</span>
            <span style={{ marginLeft: "auto", opacity: 0.6 }}>▾</span>
          </button>
        </div>
      </aside>
      <main className="main"><Body {...props} /></main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ---------- Dashboard home ---------- */
function DashboardHome({ setFoot, go }: any) {
  const [d, setD] = useState<any>(null);
  const load = () => api("/api/dashboard").then((x) => { setD(x); setFoot(x.gmail.connected ? `Gmail: ${x.gmail.email || "connected"}` : "Gmail: dry-run"); });
  useEffect(() => { load(); }, []);
  const processDue = async () => { const r = await api("/api/process-due", { method: "POST" }); alert(`Processed ${r.processed} · sent ${r.sent}${r.dry_run ? " (dry-run)" : ""}`); load(); };
  if (!d) return <Loader page />;
  const s = d.stats;
  const stat = (n: number, l: string) => (<div className="stat"><div className="n">{n}</div><div className="l">{l}</div></div>);
  return (
    <>
      <h1>Dashboard</h1><p className="lead">Overview of your outreach pipeline.</p>
      <div className="grid g4">{stat(s.scheduled, "Scheduled")}{stat(s.sent, "Sent")}{stat(s.failed, "Failed")}{stat(s.remaining_quota, "Quota left")}</div>
      <div className="grid g3" style={{ marginTop: 14 }}>{stat(s.paused, "Paused")}{stat(s.draft, "Drafts")}{stat(s.total, "Total emails")}</div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div><b>AI personalization</b><div className="mut">{d.ai_enabled ? "ON — DeepSeek via OpenRouter" : "OFF — offline fallback (set OPENROUTER_API_KEY)"}</div></div>
          <span className={`pill ${d.ai_enabled ? "on" : "off"}`}>{d.ai_enabled ? "ON" : "OFF"}</span>
        </div>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
          <div><b>Gmail sending</b><div className="mut">{d.gmail.connected ? `Connected as ${d.gmail.email || "—"}` : "Not connected — sends run in dry-run mode"}</div></div>
          <span className={`pill ${d.gmail.connected ? "on" : "off"}`}>{d.gmail.connected ? "CONNECTED" : "DRY-RUN"}</span>
        </div>
      </div>
      <div className="row"><button className="btn sec sm" onClick={processDue}>Process due now</button><span className="mut">Sends emails whose time has passed.</span></div>
    </>
  );
}

/* ---------- Scheduler bits ---------- */
function tzInfo(tz: string): { mins: number; label: string } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+00:00";
    const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    const mins = m ? (m[1] === "-" ? -1 : 1) * (parseInt(m[2]) * 60 + parseInt(m[3] || "0")) : 0;
    return { mins, label: name.replace("GMT", "UTC") };
  } catch {
    return { mins: 0, label: "UTC+00:00" };
  }
}
const TZ_OPTIONS: { value: string; label: string }[] = (() => {
  let zones: string[] = [];
  try {
    const sv = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    zones = typeof sv === "function" ? sv("timeZone") : [];
  } catch {
    zones = [];
  }
  if (!zones.length) {
    zones = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney"];
  }
  if (!zones.includes("UTC")) zones.unshift("UTC");
  return zones
    .map((z) => { const i = tzInfo(z); return { value: z, label: `(${i.label}) ${z.replace(/_/g, " ")}`, mins: i.mins }; })
    .sort((a, b) => a.mins - b.mins || a.value.localeCompare(b.value))
    .map(({ value, label }) => ({ value, label }));
})();

function TimePicker({ value, onChange }: { value: { hour: number; minute: number }; onChange: (v: { hour: number; minute: number }) => void }) {
  const [open, setOpen] = useState(false);
  const hRef = useRef<HTMLButtonElement | null>(null);
  const mRef = useRef<HTMLButtonElement | null>(null);
  const h12 = value.hour % 12 === 0 ? 12 : value.hour % 12;
  const period = value.hour < 12 ? "AM" : "PM";
  useEffect(() => {
    if (!open) return;
    hRef.current?.scrollIntoView({ block: "nearest" });
    mRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, value.hour, value.minute]);
  const setH12 = (n: number) => onChange({ hour: period === "AM" ? n % 12 : (n % 12) + 12, minute: value.minute });
  const setPeriod = (p: string) => onChange({ hour: p === "AM" ? value.hour % 12 : (value.hour % 12) + 12, minute: value.minute });
  const setMin = (m: number) => onChange({ hour: value.hour, minute: m });
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const mins = Array.from({ length: 60 }, (_, i) => i);
  const label = `${String(h12).padStart(2, "0")}:${String(value.minute).padStart(2, "0")} ${period}`;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" className="tpf-field" onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      </button>
      {open && (
        <>
          <button type="button" aria-hidden className="tpf-backdrop" onClick={() => setOpen(false)} />
          <div className="tp" style={{ position: "absolute", zIndex: 30, marginTop: 6, boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}>
            <div className="tp-col">
              {hours.map((n) => <button key={n} ref={n === h12 ? hRef : undefined} type="button" onClick={() => setH12(n)} className={"tp-item" + (n === h12 ? " on" : "")}>{String(n).padStart(2, "0")}</button>)}
            </div>
            <div className="tp-col">
              {mins.map((n) => <button key={n} ref={n === value.minute ? mRef : undefined} type="button" onClick={() => setMin(n)} className={"tp-item" + (n === value.minute ? " on" : "")}>{String(n).padStart(2, "0")}</button>)}
            </div>
            <div className="tp-col">
              {["AM", "PM"].map((p) => <button key={p} type="button" onClick={() => setPeriod(p)} className={"tp-item" + (p === period ? " on" : "")}>{p}</button>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MiniCalendar({ selected, onToggle }: { selected: Set<string>; onToggle: (iso: string) => void }) {
  const [cur, setCur] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const y = cur.getFullYear(), m = cur.getMonth();
  const iso = (yy: number, mm: number, dd: number) => `${yy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div style={{ background: "var(--field)", border: "1px solid var(--line)", borderRadius: 10, padding: 16, width: "100%" }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <button type="button" className="btn sm sec" onClick={() => setCur(new Date(y, m - 1, 1))}>‹</button>
        <b style={{ fontSize: 13 }}>{cur.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b>
        <button type="button" className="btn sm sec" onClick={() => setCur(new Date(y, m + 1, 1))}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, textAlign: "center" }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => <div key={i} className="mut tiny" style={{ fontWeight: 800 }}>{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const k = iso(y, m, d);
          const past = new Date(y, m, d) < today;
          const on = selected.has(k);
          return (
            <button key={i} type="button" disabled={past} onClick={() => onToggle(k)}
              style={{ padding: "11px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: past ? "not-allowed" : "pointer", border: "none", background: on ? "var(--acc)" : "transparent", color: on ? "var(--on-acc)" : past ? "#3a4a63" : "var(--ink)", opacity: past ? 0.5 : 1 }}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Compose ---------- */
function Compose({ toast, go }: any) {
  const [mode, setMode] = useState("ai");
  const [tpls, setTpls] = useState<any[]>([]);
  const [profs, setProfs] = useState<any[]>([]);
  const [atts, setAtts] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [tplId, setTplId] = useState(""); const [subj, setSubj] = useState("");
  const [searchTopics, setSearchTopics] = useState("");
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [sameTime, setSameTime] = useState(true);
  const [oneTime, setOneTime] = useState({ hour: 9, minute: 0 });
  const [perDateTimes, setPerDateTimes] = useState<Record<string, { hour: number; minute: number }>>({});
  const [perSlot, setPerSlot] = useState(5);
  const [spread, setSpread] = useState(true);
  const [tz, setTz] = useState(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } });
  const toggleDate = (k: string) => setDates((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [pickAtt, setPickAtt] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { api("/api/templates").then(setTpls); api("/api/professors").then(setProfs); api("/api/attachments").then(setAtts); }, []);

  const runAI = async () => {
    setBusy(true); setStatus("Researching & writing…");
    const fd = new FormData(); if (file) fd.append("file", file);
    fd.append("template_id", tplId); fd.append("subject", subj); fd.append("search_topics", searchTopics); fd.append("professor_ids", "[]");
    try { const j = await api("/api/compose/ai", { method: "POST", body: fd }); setPreview(j.emails); setStatus(`${j.emails.length} drafted`); }
    catch (e: any) { setStatus("Error: " + e.message); } setBusy(false);
  };
  const runReady = async () => {
    if (!file) { setStatus("Choose a file"); return; }
    setBusy(true); setStatus("Parsing…");
    const fd = new FormData(); fd.append("file", file);
    const path = mode === "ready_doc" ? "/api/compose/ready-doc" : "/api/compose/excel-ready";
    try { const j = await api(path, { method: "POST", body: fd }); setPreview(j.emails); setStatus(`${j.emails.length} parsed`); }
    catch (e: any) { setStatus("Error: " + e.message); } setBusy(false);
  };
  const commit = async () => {
    const ds = [...dates].sort();
    if (!ds.length) { setStatus("Pick at least one date"); return; }
    const slots = ds.map((d) => { const t = sameTime ? oneTime : (perDateTimes[d] || oneTime); return { date: d, hour: t.hour, minute: t.minute }; });
    if (slots.length * perSlot < preview.length) { setStatus(`Only ${slots.length * perSlot} slot(s) for ${preview.length} emails — add dates or raise per-slot.`); return; }
    setBusy(true); setStatus("");
    const schedule = { slots, per_slot: perSlot, spread, timezone: tz };
    try { const j = await api("/api/schedule/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: preview, schedule, attachment_ids: pickAtt }) }); toast(`Scheduled ${j.scheduled}`); setPreview([]); go("history"); }
    catch (e: any) { setStatus("Error: " + e.message); } setBusy(false);
  };

  return (
    <>
      <h1>Compose</h1><p className="lead">Draft and preview emails, then schedule them into your time slots.</p>
      <div className="tabs">
        {[["ai", "AI Personalization"], ["ready_doc", "Ready email import"], ["excel_ready", "Excel ready"]].map(([m, l]) => (
          <button key={m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setPreview([]); setFile(null); }}>{l}</button>
        ))}
      </div>
      {mode === "ai" ? (
        <div className="card">
          <Tips title="How to format your professors file">
            Upload an <b>Excel (.xlsx / .xls) or CSV</b>. The first row must be column headers, one professor per row. Required:
            <ul>
              <li><b>Name</b> — full name (also accepts <code>professor</code>, <code>full name</code>).</li>
              <li><b>Email</b> — their address (also <code>e-mail</code>, <code>contact</code>).</li>
            </ul>
            Optional but recommended for better personalization:
            <ul>
              <li><b>University / Lab</b> — <code>university</code>, <code>institution</code>, <code>affiliation</code>, <code>department</code>.</li>
              <li><b>Field / Area / Topics</b> — steers which papers are found (<code>field</code>, <code>area</code>, <code>research area</code>, <code>topics</code>, <code>keywords</code>).</li>
            </ul>
            Rows without a valid email (containing <code>@</code>) are skipped. Or skip the file and use your saved professors.
          </Tips>
          <label>Professors Excel/CSV (or use {profs.length} saved)</label>
          <FileDrop file={file} onFile={setFile} accept=".xlsx,.xls,.csv" hint="XLSX, XLS or CSV file" />
          <div className="grid g2" style={{ marginTop: 14 }}>
            <div><label>Template</label><select value={tplId} onChange={(e) => setTplId(e.target.value)}><option value="">Built-in default</option>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label>Subject override (optional)</label><input value={subj} onChange={(e) => setSubj(e.target.value)} placeholder="Leave blank to use the template subject" /></div>
          </div>
          <div style={{ marginTop: 12 }}><label>Research topics to search (optional)</label><input value={searchTopics} onChange={(e) => setSearchTopics(e.target.value)} placeholder="e.g. machine learning, protein folding — steers which papers are found" /><div className="mut tiny" style={{ marginTop: 6 }}>Used to search each professor's papers. Leave blank to use their own topics / field, or their most recent work.</div></div>
          <div className="row" style={{ marginTop: 14 }}><button className="btn" disabled={busy} onClick={runAI}>Research &amp; draft</button><span className="mut">{status}</span></div>
        </div>
      ) : (
        <div className="card">
          {mode === "ready_doc" ? (
            <Tips title="How to format your ready emails document">
              Upload a <b>PDF, DOCX or TXT</b> that already contains fully written emails. Separate each email with a blank line or a line of dashes (<code>---</code>). For each email include:
              <ul>
                <li><code>To:</code> the recipient email (or just have the email address in the block).</li>
                <li><code>Subject:</code> the subject line — optional; the first line is used if it&apos;s missing.</li>
                <li>The email body below.</li>
              </ul>
              Example block: <code>To: prof@uni.edu</code> · <code>Subject: Prospective student</code> · then the message. No AI is used — emails are sent as written.
            </Tips>
          ) : (
            <Tips title="How to format your ready emails spreadsheet">
              Upload an <b>Excel or CSV</b>, one email per row, with these header columns:
              <ul>
                <li><b>Email</b> — recipient (<code>email</code>, <code>recipient</code>, <code>to</code>).</li>
                <li><b>Subject</b> — subject line (<code>subject</code>, <code>title</code>).</li>
                <li><b>Body</b> — the full email text (<code>body</code>, <code>message</code>, <code>content</code>).</li>
              </ul>
              Rows without a valid email are skipped. No AI is used — emails are sent exactly as written.
            </Tips>
          )}
          <label>File</label><FileDrop file={file} onFile={setFile} accept={mode === "ready_doc" ? ".pdf,.docx,.txt" : ".xlsx,.xls,.csv"} hint={mode === "ready_doc" ? "PDF, DOCX or TXT" : "XLSX, XLS or CSV"} />
          <div className="mut" style={{ marginTop: 8 }}>{mode === "ready_doc" ? "PDF/DOCX/TXT with complete emails (To:/Subject:/body)." : "Excel/CSV with Email, Subject and Body columns."}</div>
          <div className="row" style={{ marginTop: 14 }}><button className="btn" disabled={busy} onClick={runReady}>Parse &amp; preview</button><span className="mut">{status}</span></div>
        </div>
      )}

      {preview.length > 0 && (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}><b>{preview.length} email(s) ready</b><button className="btn sm sec" onClick={() => setPreview([])}>Clear</button></div>
            {preview.map((e, i) => (
              <div className="emailrow" key={i}>
                <div className="row" style={{ justifyContent: "space-between" }}><b>{e.professor_name || e.email}</b><span className="mut">{e.email}</span>{e.research_source && <span className="pill draft">{e.research_source}</span>}</div>
                {e.papers_used?.length ? <div className="tiny mut" style={{ marginTop: 4 }}>Papers: {e.papers_used.join(" · ")}</div> : null}
                <div style={{ marginTop: 6 }}><b>Subject:</b> {e.subject}</div>
                <pre>{e.body}</pre>
              </div>
            ))}
          </div>
          <div className="card">
            <b>Schedule</b>
            <div className="mut tiny" style={{ margin: "4px 0 14px" }}>Pick the dates to send on, set the time, then schedule. {preview.length} email(s) to place · {[...dates].length * perSlot} slot(s) available.</div>

            <label>Send dates</label>
            <MiniCalendar selected={dates} onToggle={toggleDate} />

            <div style={{ marginTop: 18, marginBottom: 4 }}><Toggle checked={sameTime} onChange={setSameTime} label="Same time for all dates" /></div>

            <div className="grid g2" style={{ marginTop: 10, alignItems: "start" }}>
              <div>
                {sameTime ? (
                  <>
                    <label>Time (applies to every selected date)</label>
                    <TimePicker value={oneTime} onChange={setOneTime} />
                  </>
                ) : (
                  <>
                    <label>Time per date</label>
                    {[...dates].length === 0 ? (
                      <div className="mut tiny">Select dates on the calendar first.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {[...dates].sort().map((d) => (
                          <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--field)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 14px" }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                            <TimePicker value={perDateTimes[d] || oneTime} onChange={(v) => setPerDateTimes((p) => ({ ...p, [d]: v }))} />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <div className="grid g2">
                  <div><label>Per slot</label><input type="number" min={1} value={perSlot} onChange={(e) => setPerSlot(parseInt(e.target.value) || 1)} /></div>
                  <div><label>Timezone</label><select value={tz} onChange={(e) => setTz(e.target.value)}>{TZ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                </div>
                <div style={{ marginTop: 16 }}><Toggle checked={spread} onChange={setSpread} label="Spread within the hour (:00, :15…) — off = all at the exact time" /></div>
                <label style={{ marginTop: 16 }}>Attach (optional)</label>
                {atts.length ? atts.map((a) => (
                  <div key={a.id} style={{ marginBottom: 8 }}><Toggle checked={pickAtt.includes(a.id)} onChange={(v) => setPickAtt(v ? [...pickAtt, a.id] : pickAtt.filter((x) => x !== a.id))} label={<>{a.filename} <span className="mut">({a.kind})</span></>} /></div>
                )) : <div className="mut tiny">No attachments. Add a CV under Attachments.</div>}
              </div>
            </div>
            <div className="row" style={{ marginTop: 14 }}><button className="btn" disabled={busy} onClick={commit}>Schedule {preview.length} email(s)</button><span className="mut">{status}</span></div>
          </div>
        </>
      )}
    </>
  );
}

/* ---------- Professors ---------- */
function Professors({ toast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [m, setM] = useState({ name: "", email: "", university: "", topics: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [st, setSt] = useState("");
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const load = () => api("/api/professors").then((x) => { setList(x); setLoading(false); setSel(new Set()); });
  useEffect(() => { load(); }, []);
  const upload = async () => { if (!file) { setSt("Choose a file"); return; } const fd = new FormData(); fd.append("file", file); setSt("Uploading…"); try { const j = await api("/api/professors/upload", { method: "POST", body: fd }); setSt(`Added ${j.added}, skipped ${j.duplicates}`); load(); } catch (e) { setSt((e as Error).message || "Upload failed"); } };
  const blank = { name: "", email: "", university: "", topics: "" };
  const save = async () => {
    if (!m.email.includes("@")) { toast("Valid email required"); return; }
    const body = editId ? { ...m, id: editId } : m;
    const j = await api("/api/professors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (j.duplicate) toast("Already exists");
    else { toast(editId ? "Updated" : "Added"); setM(blank); setEditId(null); }
    load();
  };
  const edit = (p: any) => { setEditId(p.id); setM({ name: p.name || "", email: p.email || "", university: p.university || "", topics: p.topics || "" }); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };
  const del = async (id: string) => { await api("/api/professors/" + id, { method: "DELETE" }); load(); };
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel((s) => (s.size === list.length ? new Set() : new Set(list.map((p) => p.id))));
  const bulkDelete = async () => {
    if (!sel.size || !confirm(`Delete ${sel.size} professor(s)?`)) return;
    await api("/api/professors/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...sel] }) });
    toast(`Deleted ${sel.size}`); load();
  };
  const allChecked = list.length > 0 && sel.size === list.length;
  return (
    <>
      <h1>Professors</h1><p className="lead">Upload a spreadsheet or add manually. A &ldquo;Field&rdquo; or &ldquo;Area&rdquo; column is read as the professor&rsquo;s topics. Duplicate emails are skipped.</p>
      <div className="card"><div className="grid g2">
        <div><label>Upload Excel/CSV</label><FileDrop file={file} onFile={setFile} accept=".xlsx,.xls,.csv" hint="XLSX, XLS or CSV file" /><div className="row" style={{ marginTop: 10 }}><button className="btn sm" onClick={upload}>Upload</button><span className="mut">{st}</span></div></div>
        <div><label>{editId ? "Edit professor" : "Add manually"}</label>
          {(["name", "email", "university", "topics"] as const).map((k) => (<input key={k} placeholder={k === "topics" ? "Topics / field" : k[0].toUpperCase() + k.slice(1)} value={(m as any)[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} style={{ marginBottom: 8 }} />))}
          <div className="row"><button className="btn sm" onClick={save}>{editId ? "Update professor" : "Add professor"}</button>{editId && <button className="btn sm sec" onClick={() => { setEditId(null); setM(blank); }}>Cancel</button>}</div></div>
      </div></div>
      {sel.size > 0 && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <b>{sel.size} selected</b>
          <button className="btn sm danger" onClick={bulkDelete}>Delete selected</button>
          <button className="btn sm sec" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}
      <div className="card">{loading ? <Loader /> : list.length ? (
        <table><thead><tr><th style={{ width: 28 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th><th>Name</th><th>Email</th><th>University/Lab</th><th>Topics / Field</th><th /></tr></thead><tbody>
          {list.map((p) => (<tr key={p.id}><td><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} /></td><td><b>{p.name}</b></td><td>{p.email}</td><td>{p.university}</td><td className="mut">{p.topics}</td><td style={{ whiteSpace: "nowrap" }}><button className="btn sm sec" onClick={() => edit(p)}>Edit</button> <button className="btn sm danger" onClick={() => del(p.id)}>Delete</button></td></tr>))}
        </tbody></table>) : <div className="mut">No professors yet.</div>}</div>
    </>
  );
}

/* ---------- Templates ---------- */
function Templates({ toast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [ed, setEd] = useState<any>({ name: "", subject: "", body: "" });
  const [loading, setLoading] = useState(true);
  const load = () => api("/api/templates").then((x) => { setList(x); setLoading(false); });
  useEffect(() => { load(); }, []);
  const save = async () => { if (!ed.name) { toast("Name required"); return; } await api("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ed) }); toast("Saved"); setEd({ name: "", subject: "", body: "" }); load(); };
  const del = async (id: string) => { await api("/api/templates/" + id, { method: "DELETE" }); load(); };
  return (
    <>
      <h1>Templates</h1><p className="lead">Variables: {"{{professor_last_name}}, {{university}}, {{topics}}, {{personalized}}, {{your_name}}"}</p>
      <div className="grid g2">
        <div className="card"><b>{ed.id ? "Edit" : "New"} template</b>
          <label style={{ marginTop: 10 }}>Name</label><input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} />
          <label style={{ marginTop: 10 }}>Subject</label><input value={ed.subject} onChange={(e) => setEd({ ...ed, subject: e.target.value })} />
          <label style={{ marginTop: 10 }}>Body</label><textarea value={ed.body} onChange={(e) => setEd({ ...ed, body: e.target.value })} />
          <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" checked={!!ed.is_default} onChange={(e) => setEd({ ...ed, is_default: e.target.checked })} /> Default template</label>
          <div className="row" style={{ marginTop: 12 }}><button className="btn sm" onClick={save}>Save</button>{ed.id && <button className="btn sm sec" onClick={() => setEd({ name: "", subject: "", body: "" })}>New</button>}</div>
        </div>
        <div className="card"><b>Library ({list.length})</b>{loading && <Loader />}
          {list.map((t) => (<div className="emailrow" key={t.id}><div className="row" style={{ justifyContent: "space-between" }}><b>{t.name}</b>{t.is_default && <span className="pill on">default</span>}</div>
            <div className="mut tiny">{t.subject}</div><div className="row" style={{ marginTop: 8 }}><button className="btn sm sec" onClick={() => setEd(t)}>Edit</button><button className="btn sm danger" onClick={() => del(t.id)}>Delete</button></div></div>))}
        </div>
      </div>
    </>
  );
}

/* ---------- Attachments ---------- */
function Attachments() {
  const [list, setList] = useState<any[]>([]);
  const [kind, setKind] = useState("cv"); const [file, setFile] = useState<File | null>(null); const [st, setSt] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => api("/api/attachments").then((x) => { setList(x); setLoading(false); });
  useEffect(() => { load(); }, []);
  const up = async () => { if (!file) { setSt("Choose a file"); return; } const fd = new FormData(); fd.append("kind", kind); fd.append("file", file); await api("/api/attachments", { method: "POST", body: fd }); setSt("Uploaded"); load(); };
  const del = async (id: string) => { await api("/api/attachments/" + id, { method: "DELETE" }); load(); };
  return (
    <>
      <h1>Attachments</h1><p className="lead">Upload your CV, SOP or research proposal — attach them when scheduling.</p>
      <div className="card">
        <label>Type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ maxWidth: 220 }}><option value="cv">CV</option><option value="sop">SOP</option><option value="proposal">Research proposal</option><option value="other">Other</option></select>
        <div style={{ marginTop: 12 }}><FileDrop file={file} onFile={setFile} hint="Any document — CV, SOP or proposal" /></div>
        <div className="row" style={{ marginTop: 12 }}><button className="btn sm" onClick={up}>Upload</button><span className="mut">{st}</span></div>
      </div>
      <div className="card">{loading ? <Loader /> : list.length ? (
        <table><thead><tr><th>File</th><th>Type</th><th>Size</th><th /></tr></thead><tbody>
          {list.map((x) => (<tr key={x.id}><td><b>{x.filename}</b></td><td><span className="pill draft">{x.kind}</span></td><td className="mut">{Math.round((x.size || 0) / 1024)} KB</td><td><button className="btn sm danger" onClick={() => del(x.id)}>Delete</button></td></tr>))}
        </tbody></table>) : <div className="mut">No attachments yet.</div>}</div>
    </>
  );
}

/* ---------- History ---------- */
function RowMenu({ items }: { items: Array<{ label: string; onClick: () => void; danger?: boolean }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" className="btn sm sec" style={{ padding: "5px 11px", fontSize: 17, lineHeight: 1 }} aria-label="Actions" onClick={() => setOpen((o) => !o)}>⋯</button>
      {open && (
        <>
          <button type="button" aria-hidden className="tpf-backdrop" onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 30, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, minWidth: 150, boxShadow: "0 12px 30px rgba(0,0,0,.45)", overflow: "hidden" }}>
            {items.map((it, i) => (
              <button key={i} type="button" onClick={() => { setOpen(false); it.onClick(); }} onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--field)")} onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 13px", background: "transparent", border: "none", color: it.danger ? "#fecaca" : "var(--ink)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{it.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function History({ toast }: any) {
  const [f, setF] = useState("all"); const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PER = 20;
  const load = useCallback(() => api("/api/emails?status=" + f).then((x) => { setList(x); setLoading(false); setSel(new Set()); }), [f]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [f, query]);
  const refresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };
  const act = async (id: string, a: string) => { await api(`/api/emails/${id}/${a}`, { method: "POST" }); toast(a); load(); };
  const del = async (id: string) => { await api("/api/emails/" + id, { method: "DELETE" }); load(); };
  const allAct = async (a: string) => { if (!confirm(`${a === "pause" ? "Pause" : "Resume"} ALL emails?`)) return; const r = await api(`/api/schedule/${a}-all`, { method: "POST" }); toast(`${a}: ${r.updated}`); load(); };
  const proc = async () => { if (!confirm("Process all due emails now? This sends every email whose scheduled time has passed.")) return; const r = await api("/api/process-due", { method: "POST" }); toast(`Processed ${r.processed} · sent ${r.sent}`); load(); };
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => `${e.professor_name || ""} ${e.email || ""} ${e.subject || ""}`.toLowerCase().includes(q));
  }, [list, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER));
  const pageC = Math.min(page, pageCount);
  const paged = filtered.slice((pageC - 1) * PER, pageC * PER);
  const toggle = (id: string) => setSel((sx) => { const n = new Set(sx); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel((sx) => { const ids = paged.map((e) => e.id); const on = ids.length > 0 && ids.every((id) => sx.has(id)); const n = new Set(sx); ids.forEach((id) => (on ? n.delete(id) : n.add(id))); return n; });
  const bulk = async (a: string) => {
    const ids = [...sel];
    if (!ids.length) return;
    if (a === "delete" && !confirm(`Delete ${ids.length} email(s)?`)) return;
    for (const id of ids) {
      try { if (a === "delete") await api("/api/emails/" + id, { method: "DELETE" }); else await api(`/api/emails/${id}/${a}`, { method: "POST" }); } catch { /* skip failures */ }
    }
    toast(`${a}: ${ids.length}`); setSel(new Set()); load();
  };
  const allChecked = paged.length > 0 && paged.every((e) => sel.has(e.id));
  return (
    <>
      <h1>Schedule &amp; History</h1><p className="lead">Every drafted, scheduled, sent and failed email — with full control.</p>
      <div className="row" style={{ marginBottom: 16, gap: 8 }}>
        <button className="btn sm sec" onClick={() => allAct("pause")}>Pause all</button>
        <button className="btn sm sec" onClick={() => allAct("resume")}>Resume all</button>
        <button className="btn sm" onClick={proc}>Process due now</button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipient or subject" style={{ maxWidth: 220, height: 34, padding: "7px 12px" }} />
          <button className="btn sm sec" title="Refresh" aria-label="Refresh" onClick={refresh} style={{ display: "inline-flex", alignItems: "center", padding: "7px 10px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: refreshing ? "sbspin .7s linear infinite" : undefined }}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>
          </button>
          <div style={{ position: "relative" }}>
            <button className="btn sm sec" style={{ display: "inline-flex", alignItems: "center", gap: 7 }} onClick={() => setFilterOpen((o) => !o)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              <span style={{ textTransform: "capitalize" }}>{f}</span>
            </button>
            {filterOpen && (
              <>
                <button type="button" aria-hidden className="tpf-backdrop" onClick={() => setFilterOpen(false)} />
                <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 30, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, minWidth: 150, boxShadow: "0 12px 30px rgba(0,0,0,.4)", overflow: "hidden" }}>
                  {["all", "scheduled", "paused", "sent", "failed", "draft", "cancelled"].map((sopt) => (
                    <button key={sopt} type="button" onClick={() => { setF(sopt); setFilterOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 13px", background: sopt === f ? "var(--field)" : "transparent", border: "none", color: "var(--ink)", fontSize: 13, fontWeight: 700, textTransform: "capitalize", cursor: "pointer" }}>{sopt}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {sel.size > 0 && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 12 }}>
          <b>{sel.size} selected</b>
          <button className="btn sm sec" onClick={() => bulk("pause")}>Pause</button>
          <button className="btn sm sec" onClick={() => bulk("resume")}>Resume</button>
          <button className="btn sm sec" onClick={() => bulk("send-now")}>Send now</button>
          <button className="btn sm sec" onClick={() => bulk("cancel")}>Cancel</button>
          <button className="btn sm danger" onClick={() => bulk("delete")}>Delete</button>
          <button className="btn sm sec" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}
      <div className="card">{loading ? <Loader /> : filtered.length ? (
        <>
        <table><thead><tr><th style={{ width: 28 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th><th>When</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {paged.map((e) => {
            const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [];
            if (e.status === "scheduled") items.push({ label: "Pause", onClick: () => act(e.id, "pause") });
            if (e.status === "paused") items.push({ label: "Resume", onClick: () => act(e.id, "resume") });
            if (["scheduled", "paused", "draft"].includes(e.status)) items.push({ label: "Send now", onClick: () => act(e.id, "send-now") });
            if (["scheduled", "paused"].includes(e.status)) items.push({ label: "Cancel", onClick: () => act(e.id, "cancel") });
            items.push({ label: "Delete", onClick: () => del(e.id), danger: true });
            return (<tr key={e.id}>
              <td><input type="checkbox" checked={sel.has(e.id)} onChange={() => toggle(e.id)} aria-label="Select email" /></td>
              <td className="mut">{fmt(e.send_at)}</td>
              <td><b>{e.professor_name || e.email}</b><div className="mut tiny">{e.email}</div></td>
              <td>{e.subject}{e.error && <div className="tiny" style={{ color: "var(--bad)" }}>{e.error}</div>}</td>
              <td><span className={`pill ${e.status}`}>{e.status}</span></td>
              <td><RowMenu items={items} /></td>
            </tr>);
          })}
        </tbody></table>
        {pageCount > 1 && (
          <div className="row" style={{ justifyContent: "center", marginTop: 14, gap: 10 }}>
            <button className="btn sm sec" disabled={pageC <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>&larr; Prev</button>
            <span className="mut">Page {pageC} of {pageCount} · {filtered.length} total</span>
            <button className="btn sm sec" disabled={pageC >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next &rarr;</button>
          </div>
        )}
        </>
      ) : <div className="mut">{query ? "No emails match your search." : "Nothing here."}</div>}</div>
    </>
  );
}

/* ---------- Find Professors ---------- */
const COUNTRIES: [string, string][] = [
  ["", "Any country"], ["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"],
  ["AU", "Australia"], ["DE", "Germany"], ["FR", "France"], ["NL", "Netherlands"],
  ["CH", "Switzerland"], ["SE", "Sweden"], ["IT", "Italy"], ["ES", "Spain"],
  ["CN", "China"], ["JP", "Japan"], ["KR", "South Korea"], ["SG", "Singapore"],
  ["IN", "India"], ["PK", "Pakistan"], ["SA", "Saudi Arabia"], ["AE", "UAE"],
];

function Picker({ type, value = "", onPick, placeholder, clearOnPick = false }: { type: "institutions" | "concepts"; value?: string; onPick: (id: string, label: string) => void; placeholder: string; clearOnPick?: boolean }) {
  const [q, setQ] = useState(value);
  const [opts, setOpts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(value); // committed label; suppresses re-fetch after a selection
  useEffect(() => { setQ(value); setPicked(value); }, [value]);
  useEffect(() => {
    if (!q.trim() || q === picked) { setOpts([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try { const j = await api(`/api/openalex/autocomplete?type=${type}&q=${encodeURIComponent(q)}`); setOpts(j.results || []); setOpen(true); } catch { setOpts([]); }
    }, 260);
    return () => clearTimeout(t);
  }, [q, type, picked]);
  const choose = (o: any) => {
    onPick(o.id, o.label);
    if (clearOnPick) { setQ(""); setPicked(""); } else { setQ(o.label); setPicked(o.label); }
    setOpts([]); setOpen(false);
  };
  return (
    <div style={{ position: "relative" }}>
      <input value={q} placeholder={placeholder} onChange={(e) => { setQ(e.target.value); if (!e.target.value && !clearOnPick) onPick("", ""); }} onFocus={() => opts.length > 0 && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && opts.length > 0 && (
        <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, marginTop: 4, maxHeight: 220, overflow: "auto" }}>
          {opts.map((o) => (
            <button key={o.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", color: "var(--ink)", cursor: "pointer", fontSize: 13 }}>
              {o.label}{o.hint ? <span className="mut tiny"> · {o.hint}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FindProfessors({ toast }: any) {
  const [country, setCountry] = useState("");
  const [inst, setInst] = useState({ id: "", label: "" });
  const [countryUnis, setCountryUnis] = useState<Array<{ id: string; label: string }>>([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [concepts, setConcepts] = useState<Array<{ id: string; label: string }>>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<Record<string, any>>({});
  const [emails, setEmails] = useState<Record<string, { loading?: boolean; email?: string | null }>>({});
  const [adding, setAdding] = useState(false);
  const [needsEmail, setNeedsEmail] = useState<any[]>([]);

  useEffect(() => {
    setInst({ id: "", label: "" });
    if (!country) { setCountryUnis([]); return; }
    let alive = true;
    setUniLoading(true);
    api(`/api/openalex/institutions?country=${country}`)
      .then((j) => { if (alive) setCountryUnis(j.results || []); })
      .catch(() => { if (alive) setCountryUnis([]); })
      .finally(() => { if (alive) setUniLoading(false); });
    return () => { alive = false; };
  }, [country]);

  const search = async (p = 1) => {
    if (!country && !inst.id && !concepts.length && !query.trim()) { setStatus("Pick at least one filter"); return; }
    setBusy(true); setStatus("Searching…"); setPage(p);
    try {
      const j = await api("/api/professors/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country, institutionId: inst.id, conceptIds: concepts.map((c) => c.id), query, page: p }) });
      setResults(j.results || []); setTotal(j.total || 0); setStatus(`${j.total} researcher(s) found`);
    } catch (e: any) { setStatus("Error: " + e.message); }
    setBusy(false);
  };
  const toggle = (r: any) => setSel((s) => { const n = { ...s }; if (n[r.openalex_id]) delete n[r.openalex_id]; else n[r.openalex_id] = r; return n; });
  const findEmail = async (r: any) => {
    setEmails((m) => ({ ...m, [r.openalex_id]: { loading: true } }));
    try {
      const j = await api("/api/professors/find-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ openalex_id: r.openalex_id, name: r.name }) });
      setEmails((m) => ({ ...m, [r.openalex_id]: { loading: false, email: j.email || null } }));
    } catch {
      setEmails((m) => ({ ...m, [r.openalex_id]: { loading: false, email: null } }));
    }
  };
  const selCount = Object.keys(sel).length;
  const addSelected = async () => {
    if (!selCount) return;
    setAdding(true); setStatus("Adding & finding emails from their papers…");
    try {
      const j = await api("/api/professors/add-from-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ professors: Object.values(sel) }) });
      toast(`Added ${j.added}${j.duplicates ? `, ${j.duplicates} dup` : ""}`);
      setNeedsEmail(j.needsEmail || []); setSel({});
      setStatus(`Added ${j.added}. ${(j.needsEmail || []).length} need an email.`);
    } catch (e: any) { setStatus("Error: " + e.message); }
    setAdding(false);
  };
  const addManual = async (p: any, email: string) => {
    if (!email.includes("@")) { toast("Valid email required"); return; }
    await api("/api/professors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: p.name, email, university: p.institution || "", topics: p.topics || "" }) });
    toast("Added"); setNeedsEmail((list) => list.filter((x) => x !== p));
  };

  return (
    <>
      <h1>Find Professors</h1><p className="lead">Search researchers by country, university and field, then add them to your list. Emails are pulled from their published papers where available.</p>
      <div className="card">
        <div className="grid g2">
          <div><label>Country</label><select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
          <div><label>University / institution</label>
            {country ? (
              <select value={inst.id} onChange={(e) => { const u = countryUnis.find((x) => x.id === e.target.value); setInst(u ? { id: u.id, label: u.label } : { id: "", label: "" }); }} disabled={uniLoading}>
                <option value="">{uniLoading ? "Loading universities…" : `All universities (${countryUnis.length})`}</option>
                {countryUnis.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            ) : (
              <Picker type="institutions" value={inst.label} placeholder="e.g. Stanford University" onPick={(id, label) => setInst({ id, label })} />
            )}
          </div>
        </div>
        <div className="grid g2" style={{ marginTop: 12 }}>
          <div><label>Field of research (add several to broaden)</label>
            <Picker type="concepts" value="" clearOnPick placeholder="e.g. Machine learning" onPick={(id, label) => { if (id && !concepts.some((c) => c.id === id)) setConcepts((cs) => [...cs, { id, label }]); }} />
            {concepts.length > 0 && (
              <div className="row" style={{ marginTop: 8, gap: 6 }}>
                {concepts.map((c) => (
                  <span key={c.id} className="pill draft" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{c.label}<button type="button" onClick={() => setConcepts((cs) => cs.filter((x) => x.id !== c.id))} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 800, padding: 0, lineHeight: 1 }}>×</button></span>
                ))}
              </div>
            )}
          </div>
          <div><label>Professor name (optional)</label><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by professor name" /><div className="mut tiny" style={{ marginTop: 6 }}>Searches names only — use Field of research above for topics.</div></div>
        </div>
        <div className="row" style={{ marginTop: 14 }}><button className="btn" disabled={busy} onClick={() => search(1)}>Search</button><span className="mut">{status}</span></div>
      </div>

      {selCount > 0 && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <b>{selCount} selected</b>
          <button className="btn sm" disabled={adding} onClick={addSelected}>{adding ? "Adding…" : "Add selected to my list"}</button>
          <button className="btn sm sec" onClick={() => setSel({})}>Clear</button>
        </div>
      )}

      {needsEmail.length > 0 && (
        <div className="card">
          <b>No email found for {needsEmail.length} — add manually</b>
          <div className="mut tiny" style={{ margin: "4px 0 10px" }}>We couldn&apos;t find a corresponding-author email in their open-access papers. Enter it to add them.</div>
          {needsEmail.map((p, i) => (
            <div className="row" key={i} style={{ marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 160 }}><b>{p.name}</b><div className="mut tiny">{p.institution}</div></div>
              <input id={`ne_${i}`} placeholder="email@university.edu" style={{ maxWidth: 240 }} />
              <button className="btn sm" onClick={() => addManual(p, (document.getElementById(`ne_${i}`) as HTMLInputElement)?.value || "")}>Add</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">{busy ? <Loader /> : results.length ? (
        <table><thead><tr><th style={{ width: 28 }} /><th>Name</th><th>Institution</th><th>Country</th><th>Topics</th><th>Works</th><th>Cited</th><th>Email</th></tr></thead><tbody>
          {results.map((r) => (
            <tr key={r.openalex_id}>
              <td><input type="checkbox" checked={!!sel[r.openalex_id]} onChange={() => toggle(r)} /></td>
              <td><b>{r.name}</b>{r.orcid ? <div className="mut tiny">ORCID {r.orcid}</div> : null}</td>
              <td>{r.institution || "—"}</td>
              <td className="mut">{(r.country || "").toUpperCase()}</td>
              <td className="mut" style={{ maxWidth: 240 }}>{r.topics}</td>
              <td>{r.works_count}</td>
              <td>{r.cited_by_count}</td>
              <td>{(() => {
                const em = emails[r.openalex_id];
                if (!em) return <button className="btn sm sec" onClick={() => findEmail(r)}>Find</button>;
                if (em.loading) return <span className="mut tiny">Searching…</span>;
                return em.email ? <a href={`mailto:${em.email}`} className="tiny" style={{ color: "var(--acc2)", wordBreak: "break-all" }}>{em.email}</a> : <span className="mut tiny">Not found</span>;
              })()}</td>
            </tr>
          ))}
        </tbody></table>) : <div className="mut">No results yet — set filters and search.</div>}</div>

      {results.length > 0 && (
        <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
          <button className="btn sm sec" disabled={page <= 1 || busy} onClick={() => search(page - 1)}>&larr; Prev</button>
          <span className="mut">Page {page}{total ? ` · ${total} total` : ""}</span>
          <button className="btn sm sec" disabled={results.length < 25 || busy} onClick={() => search(page + 1)}>Next &rarr;</button>
        </div>
      )}
    </>
  );
}

/* ---------- Email harvesting ---------- */
const CC_NAMES: Record<string, string> = { cn: "China", jp: "Japan", kr: "South Korea", tw: "Taiwan", sg: "Singapore" };

function EmailHarvest({ toast }: any) {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api("/api/admin/harvest/stats").then(setD).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!d?.active) return;
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [d?.active]);
  const toggle = async () => {
    const next = !d?.active;
    setD((p: any) => (p ? { ...p, active: next } : p)); // optimistic
    try {
      const r = await api("/api/admin/harvest/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: next }) });
      setD((p: any) => (p ? { ...p, active: !!r.active } : p)); // trust server
      toast(r.active ? "Background crawl on" : "Background crawl paused");
    } catch (e: any) {
      setD((p: any) => (p ? { ...p, active: !next } : p)); // revert
      toast(e.message || "Could not change crawl state");
    }
    load();
  };
  const runOne = async () => {
    setBusy(true);
    try {
      const r = await api("/api/admin/harvest/tick", { method: "POST" });
      toast(r.idle ? "Crawl is paused — turn it on first" : r.done ? "All countries done" : `${(r.country || "").toUpperCase()}: +${r.stored || 0} emails`);
    } catch (e: any) { toast(e.message || "Failed"); }
    setBusy(false); load();
  };
  const reset = async (c: string) => {
    if (!confirm(`Re-crawl ${(CC_NAMES[c] || c)} from the start?`)) return;
    await api("/api/admin/harvest/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: c }) });
    load();
  };
  if (!d) return <Loader page />;
  return (
    <>
      <h1>Email cache</h1><p className="lead">Builds a shared professor-email database by scraping the first page of their open-access papers.</p>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="stat"><div className="n">{Number(d.total || 0).toLocaleString()}</div><div className="l">Emails cached</div></div>
        <div className="stat"><div className="n">{Number(d.high || 0).toLocaleString()}</div><div className="l">High confidence</div></div>
        <div className="stat"><div className="n" style={{ color: d.active ? "var(--acc)" : "var(--mut)" }}>{d.active ? "Running" : "Paused"}</div><div className="l">Background crawl</div></div>
      </div>
      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Toggle checked={!!d.active} onChange={toggle} label={d.active ? "Background crawl on" : "Background crawl off"} />
        <button className="btn sm sec" disabled={busy} onClick={runOne}>{busy ? "Running…" : "Run one batch now"}</button>
        <span className="mut tiny">When on, a 1-minute cron advances it automatically. One batch ≈ 15 papers.</span>
      </div>
      <div className="grid g2">
        {(d.countries || []).map((c: any) => (
          <div className="card" key={c.country} style={{ marginBottom: 0 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>{CC_NAMES[c.country] || c.country.toUpperCase()}</b>
              <span className={`pill ${c.status === "done" ? "sent" : c.status === "running" ? "scheduled" : "draft"}`}>{c.status}</span>
            </div>
            <div className="row" style={{ gap: 20, marginTop: 12 }}>
              <div><div style={{ fontSize: 22, fontWeight: 800 }}>{Number(c.cached || 0).toLocaleString()}</div><div className="mut tiny">emails cached</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 800 }}>{Number(c.papers || 0).toLocaleString()}</div><div className="mut tiny">papers scanned</div></div>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              <button className="btn sm sec" onClick={() => reset(c.country)}>Re-crawl</button>
              {c.updated_at && <span className="mut tiny">updated {fmt(c.updated_at)}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Settings ---------- */
function Settings({ toast }: any) {
  const [d, setD] = useState<any>(null); const [quota, setQuota] = useState(500); const [name, setName] = useState("");
  const load = () => api("/api/dashboard").then((x) => { setD(x); setQuota(x.stats.daily_quota); setName(x.sender_name || ""); });
  useEffect(() => { load(); }, []);
  const save = async () => { await api("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daily_quota: quota, sender_name: name }) }); toast("Saved"); load(); };
  if (!d) return <Loader page />;
  return (
    <>
      <h1>Settings</h1><p className="lead">Gmail connection, sender name, sending quota, AI status.</p>
      <div className="card"><div className="row" style={{ justifyContent: "space-between" }}>
        <div><b>Gmail</b><div className="mut">{d.gmail.connected ? `Connected as ${d.gmail.email || "—"}` : "Not connected — sends run in dry-run mode"}</div></div>
        <span className={`pill ${d.gmail.connected ? "on" : "off"}`}>{d.gmail.connected ? "CONNECTED" : "DRY-RUN"}</span></div>
        {!d.gmail.connected && <div className="mut tiny" style={{ marginTop: 10 }}>Gmail connects automatically when you sign in with Google (with send permission). If it shows dry-run, sign out and back in and grant Gmail access.</div>}
      </div>
      <div className="card"><label>Your name (fills {"{{your_name}}"})</label><div className="row"><input value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 320 }} /></div>
        <label style={{ marginTop: 14 }}>Daily sending quota</label><div className="row"><input type="number" value={quota} onChange={(e) => setQuota(parseInt(e.target.value) || 500)} style={{ maxWidth: 160 }} /><button className="btn sm" onClick={save}>Save</button></div>
        <div className="mut tiny" style={{ marginTop: 8 }}>Used today: {d.stats.sent_today} · remaining: {d.stats.remaining_quota}</div></div>
      <div className="card"><div className="row" style={{ justifyContent: "space-between" }}><div><b>AI personalization</b><div className="mut">{d.ai_enabled ? "ON" : "OFF — set OPENROUTER_API_KEY"}</div></div><span className={`pill ${d.ai_enabled ? "on" : "off"}`}>{d.ai_enabled ? "ON" : "OFF"}</span></div></div>
      <EmailTester toast={toast} />
   
    </>
  );
}
