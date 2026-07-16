"use client";
import { useEffect, useState, useCallback } from "react";
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

const SECTIONS: [string, string, string][] = [
  ["dashboard", "Dashboard", "▨"], ["compose", "Compose", "✎"], ["professors", "Professors", "👤"],
  ["templates", "Templates", "▤"], ["attachments", "Attachments", "📎"], ["history", "Schedule & History", "🗓"], ["settings", "Settings", "⚙"],
];

export default function Dashboard() {
  const [section, setSection] = useState("dashboard");
  const [toast, setToastMsg] = useState<string | null>(null);
  const [foot, setFoot] = useState("");
  const showToast = useCallback((m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2200); }, []);
  const signOut = async () => { await supabaseBrowser().auth.signOut(); location.reload(); };

  const props = { toast: showToast, setFoot, go: setSection };
  const Body = {
    dashboard: DashboardHome, compose: Compose, professors: Professors,
    templates: Templates, attachments: Attachments, history: History, settings: Settings,
  }[section] as React.FC<any>;

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><div className="logo">SB</div><div><b>ScholarBridge</b><span>AI outreach scheduler</span></div></div>
        <nav className="nav">
          {SECTIONS.map(([id, label, ic]) => (
            <button key={id} className={id === section ? "on" : ""} onClick={() => setSection(id)}><span>{ic}</span> {label}</button>
          ))}
          <button onClick={signOut} style={{ marginTop: 8 }}><span>⎋</span> Sign out</button>
        </nav>
        <div className="foot">{foot}</div>
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
  if (!d) return <p className="mut">Loading…</p>;
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
  const [cfg, setCfg] = useState({ days: "Tue,Wed,Thu", hours: "6,7,8", per: 5, tz: "UTC", spread: true });
  const [pickAtt, setPickAtt] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { api("/api/templates").then(setTpls); api("/api/professors").then(setProfs); api("/api/attachments").then(setAtts); }, []);

  const runAI = async () => {
    setBusy(true); setStatus("Researching & writing…");
    const fd = new FormData(); if (file) fd.append("file", file);
    fd.append("template_id", tplId); fd.append("subject", subj); fd.append("professor_ids", "[]");
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
    setBusy(true);
    const schedule = { days: cfg.days.split(",").map((s) => s.trim()).filter(Boolean), slot_hours: cfg.hours.split(",").map((s) => parseInt(s)).filter((n) => !isNaN(n)), per_slot: cfg.per, timezone: cfg.tz, spread: cfg.spread };
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
          <div className="grid g2">
            <div><label>Professors Excel/CSV (or use {profs.length} saved)</label><input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            <div><label>Template</label><select value={tplId} onChange={(e) => setTplId(e.target.value)}><option value="">Built-in default</option>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          </div>
          <div style={{ marginTop: 12 }}><label>Subject override (optional)</label><input value={subj} onChange={(e) => setSubj(e.target.value)} placeholder="Leave blank to use the template subject" /></div>
          <div className="row" style={{ marginTop: 14 }}><button className="btn" disabled={busy} onClick={runAI}>Research &amp; draft</button><span className="mut">{status}</span></div>
        </div>
      ) : (
        <div className="card">
          <label>File</label><input type="file" accept={mode === "ready_doc" ? ".pdf,.docx,.txt" : ".xlsx,.xls,.csv"} onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
            <div className="grid g4" style={{ marginTop: 10 }}>
              <div><label>Days</label><input value={cfg.days} onChange={(e) => setCfg({ ...cfg, days: e.target.value })} /></div>
              <div><label>Hours</label><input value={cfg.hours} onChange={(e) => setCfg({ ...cfg, hours: e.target.value })} /></div>
              <div><label>Per slot</label><input type="number" value={cfg.per} onChange={(e) => setCfg({ ...cfg, per: parseInt(e.target.value) || 5 })} /></div>
              <div><label>Timezone</label><input value={cfg.tz} onChange={(e) => setCfg({ ...cfg, tz: e.target.value })} /></div>
            </div>
            <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" checked={cfg.spread} onChange={(e) => setCfg({ ...cfg, spread: e.target.checked })} /> Spread within the hour (6:00, 6:12…) — off = all at :00</label>
            <label style={{ marginTop: 12 }}>Attach (optional)</label>
            {atts.length ? atts.map((a) => (
              <label className="chk" key={a.id}><input type="checkbox" checked={pickAtt.includes(a.id)} onChange={(e) => setPickAtt(e.target.checked ? [...pickAtt, a.id] : pickAtt.filter((x) => x !== a.id))} /> {a.filename} <span className="mut">({a.kind})</span></label>
            )) : <div className="mut">No attachments. Add a CV under Attachments.</div>}
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
  const [file, setFile] = useState<File | null>(null);
  const [st, setSt] = useState("");
  const load = () => api("/api/professors").then(setList);
  useEffect(() => { load(); }, []);
  const upload = async () => { if (!file) { setSt("Choose a file"); return; } const fd = new FormData(); fd.append("file", file); const j = await api("/api/professors/upload", { method: "POST", body: fd }); setSt(`Added ${j.added}, skipped ${j.duplicates}`); load(); };
  const add = async () => { const j = await api("/api/professors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) }); if (j.duplicate) toast("Already exists"); else { toast("Added"); setM({ name: "", email: "", university: "", topics: "" }); } load(); };
  const del = async (id: string) => { await api("/api/professors/" + id, { method: "DELETE" }); load(); };
  return (
    <>
      <h1>Professors</h1><p className="lead">Upload a spreadsheet or add manually. Duplicate emails are skipped.</p>
      <div className="card"><div className="grid g2">
        <div><label>Upload Excel/CSV</label><input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} /><div className="row" style={{ marginTop: 10 }}><button className="btn sm" onClick={upload}>Upload</button><span className="mut">{st}</span></div></div>
        <div><label>Add manually</label>
          {(["name", "email", "university", "topics"] as const).map((k) => (<input key={k} placeholder={k[0].toUpperCase() + k.slice(1)} value={(m as any)[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} style={{ marginBottom: 8 }} />))}
          <button className="btn sm" onClick={add}>Add professor</button></div>
      </div></div>
      <div className="card">{list.length ? (
        <table><thead><tr><th>Name</th><th>Email</th><th>University/Lab</th><th>Topics</th><th /></tr></thead><tbody>
          {list.map((p) => (<tr key={p.id}><td><b>{p.name}</b></td><td>{p.email}</td><td>{p.university}</td><td className="mut">{p.topics}</td><td><button className="btn sm danger" onClick={() => del(p.id)}>Delete</button></td></tr>))}
        </tbody></table>) : <div className="mut">No professors yet.</div>}</div>
    </>
  );
}

/* ---------- Templates ---------- */
function Templates({ toast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [ed, setEd] = useState<any>({ name: "", subject: "", body: "" });
  const load = () => api("/api/templates").then(setList);
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
        <div className="card"><b>Library ({list.length})</b>
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
  const load = () => api("/api/attachments").then(setList);
  useEffect(() => { load(); }, []);
  const up = async () => { if (!file) { setSt("Choose a file"); return; } const fd = new FormData(); fd.append("kind", kind); fd.append("file", file); await api("/api/attachments", { method: "POST", body: fd }); setSt("Uploaded"); load(); };
  const del = async (id: string) => { await api("/api/attachments/" + id, { method: "DELETE" }); load(); };
  return (
    <>
      <h1>Attachments</h1><p className="lead">Upload your CV, SOP or research proposal — attach them when scheduling.</p>
      <div className="card"><div className="row"><select value={kind} onChange={(e) => setKind(e.target.value)} style={{ maxWidth: 180 }}><option value="cv">CV</option><option value="sop">SOP</option><option value="proposal">Research proposal</option><option value="other">Other</option></select>
        <input type="file" style={{ maxWidth: 320 }} onChange={(e) => setFile(e.target.files?.[0] || null)} /><button className="btn sm" onClick={up}>Upload</button><span className="mut">{st}</span></div></div>
      <div className="card">{list.length ? (
        <table><thead><tr><th>File</th><th>Type</th><th>Size</th><th /></tr></thead><tbody>
          {list.map((x) => (<tr key={x.id}><td><b>{x.filename}</b></td><td><span className="pill draft">{x.kind}</span></td><td className="mut">{Math.round((x.size || 0) / 1024)} KB</td><td><button className="btn sm danger" onClick={() => del(x.id)}>Delete</button></td></tr>))}
        </tbody></table>) : <div className="mut">No attachments yet.</div>}</div>
    </>
  );
}

/* ---------- History ---------- */
function History({ toast }: any) {
  const [f, setF] = useState("all"); const [list, setList] = useState<any[]>([]);
  const load = useCallback(() => api("/api/emails?status=" + f).then(setList), [f]);
  useEffect(() => { load(); }, [load]);
  const act = async (id: string, a: string) => { await api(`/api/emails/${id}/${a}`, { method: "POST" }); toast(a); load(); };
  const del = async (id: string) => { await api("/api/emails/" + id, { method: "DELETE" }); load(); };
  const allAct = async (a: string) => { const r = await api(`/api/schedule/${a}-all`, { method: "POST" }); toast(`${a}: ${r.updated}`); load(); };
  const proc = async () => { const r = await api("/api/process-due", { method: "POST" }); toast(`Processed ${r.processed} · sent ${r.sent}`); load(); };
  return (
    <>
      <h1>Schedule &amp; History</h1><p className="lead">Every drafted, scheduled, sent and failed email — with full control.</p>
      <div className="row" style={{ marginBottom: 12 }}><button className="btn sm sec" onClick={() => allAct("pause")}>Pause all</button><button className="btn sm sec" onClick={() => allAct("resume")}>Resume all</button><button className="btn sm" onClick={proc}>Process due now</button></div>
      <div className="tabs">{["all", "scheduled", "paused", "sent", "failed", "draft", "cancelled"].map((s) => (<button key={s} className={s === f ? "on" : ""} onClick={() => setF(s)}>{s}</button>))}</div>
      <div className="card">{list.length ? (
        <table><thead><tr><th>When</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {list.map((e) => (<tr key={e.id}>
            <td className="mut">{fmt(e.send_at)}</td>
            <td><b>{e.professor_name || e.email}</b><div className="mut tiny">{e.email}</div></td>
            <td>{e.subject}{e.error && <div className="tiny" style={{ color: "var(--bad)" }}>{e.error}</div>}</td>
            <td><span className={`pill ${e.status}`}>{e.status}</span></td>
            <td className="row">
              {e.status === "scheduled" && <button className="btn sm sec" onClick={() => act(e.id, "pause")}>Pause</button>}
              {e.status === "paused" && <button className="btn sm sec" onClick={() => act(e.id, "resume")}>Resume</button>}
              {["scheduled", "paused", "draft"].includes(e.status) && <button className="btn sm sec" onClick={() => act(e.id, "send-now")}>Send now</button>}
              {["scheduled", "paused"].includes(e.status) && <button className="btn sm sec" onClick={() => act(e.id, "cancel")}>Cancel</button>}
              <button className="btn sm danger" onClick={() => del(e.id)}>Delete</button>
            </td></tr>))}
        </tbody></table>) : <div className="mut">Nothing here.</div>}</div>
    </>
  );
}

/* ---------- Settings ---------- */
function Settings({ toast }: any) {
  const [d, setD] = useState<any>(null); const [quota, setQuota] = useState(500); const [name, setName] = useState("");
  const load = () => api("/api/dashboard").then((x) => { setD(x); setQuota(x.stats.daily_quota); setName(x.sender_name || ""); });
  useEffect(() => { load(); }, []);
  const save = async () => { await api("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daily_quota: quota, sender_name: name }) }); toast("Saved"); load(); };
  if (!d) return <p className="mut">Loading…</p>;
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
    </>
  );
}
