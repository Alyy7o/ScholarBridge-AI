"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import BrandLogo from "@/components/BrandLogo";

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || `HTTP ${r.status}`);
  return j;
}

/** Shared toolbar refresh control used on every dashboard section. */
function RefreshButton({ onClick, busy }: { onClick: () => void | Promise<void>; busy?: boolean }) {
  const [spin, setSpin] = useState(false);
  const run = async () => {
    setSpin(true);
    try { await onClick(); } finally { setSpin(false); }
  };
  const active = busy || spin;
  return (
    <button
      type="button"
      className="btn sm sec"
      title="Refresh"
      aria-label="Refresh"
      disabled={active}
      onClick={run}
      style={{ display: "inline-flex", alignItems: "center", padding: "7px 10px" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: active ? "sbspin .7s linear infinite" : undefined }}>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
      </svg>
    </button>
  );
}
const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return String(iso); }
};

/** Re-run Google OAuth (with Gmail send scope) to refresh an expired connection.
 *  Same flow as first sign-in; the /auth/callback stores the new token. */
async function reconnectGoogle() {
  await supabaseBrowser().auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: "email profile https://www.googleapis.com/auth/gmail.send",
      redirectTo: `${location.origin}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
}

/** Warning banner shown when the stored Gmail token has expired/been revoked. */
function GmailReconnectBanner() {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 14, marginBottom: 16, border: "1px solid var(--bad, #ef4444)", background: "rgba(239,68,68,.08)" }}>
      <span style={{ display: "inline-flex", color: "var(--bad, #ef4444)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <b>Gmail sending is paused</b>
        <div className="mut tiny" style={{ marginTop: 2 }}>Your Google connection expired, so scheduled emails can&apos;t be sent. Reconnect to resume sending.</div>
      </div>
      <button className="btn sm" onClick={reconnectGoogle}>Reconnect Google</button>
    </div>
  );
}

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

const looksHtml = (s: string) => /<(?:b|strong|i|em|u|p|br|ul|ol|li|a|div|span)\b[^>]*>/i.test(s || "");
// Seed the editor: plain text -> keep line breaks; HTML -> use as-is.
const seedHtml = (s: string) =>
  looksHtml(s) ? s : (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

/** Minimal rich-text editor (bold / italic / underline / list) built on the
 *  browser's editing commands — no external dependency. Emits sanitized-ready HTML. */
function RichText({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (ref.current) ref.current.innerHTML = seedHtml(value); /* seed once */ }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const emit = () => onChange(ref.current?.innerHTML || "");
  const cmd = (c: string, val?: string) => { ref.current?.focus(); document.execCommand(c, false, val); emit(); };
  const link = () => { const u = prompt("Link URL (https://…)"); if (u) cmd("createLink", u); };
  const keep = (e: React.MouseEvent) => e.preventDefault(); // don't lose the selection on button click
  return (
    <div className="rte">
      <div className="rte-bar">
        <button type="button" title="Bold" onMouseDown={keep} onClick={() => cmd("bold")}><b>B</b></button>
        <button type="button" title="Italic" onMouseDown={keep} onClick={() => cmd("italic")}><i>I</i></button>
        <button type="button" title="Underline" onMouseDown={keep} onClick={() => cmd("underline")}><u>U</u></button>
        <span className="rte-sep" />
        <button type="button" title="Bulleted list" onMouseDown={keep} onClick={() => cmd("insertUnorderedList")}>• List</button>
        <button type="button" title="Add link" onMouseDown={keep} onClick={link}>Link</button>
        <span className="rte-sep" />
        <button type="button" title="Clear formatting" onMouseDown={keep} onClick={() => { cmd("removeFormat"); cmd("unlink"); }}>Clear</button>
      </div>
      <div className="rte-area" ref={ref} contentEditable suppressContentEditableWarning onInput={emit} />
    </div>
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

// Outlined line icons (stroke, no fill) to match the SENTRA look.
const I = (d: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: I(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  emails: I(<><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="m3 8 9 6 9-6" /></>),
  find: I(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>),
  professors: I(<><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></>),
  compose: I(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>),
  templates: I(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  attachments: I(<path d="M21.4 11.05 12.25 20.2a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.48-8.49" />),
  history: I(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  users: I(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>),
  settings: I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.61.78 1.03 1.42 1.03H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
};
// Sidebar items (Settings is reachable from the account menu, not the sidebar).
const SECTIONS_BASE: [string, string][] = [
  ["dashboard", "Dashboard"], ["emails", "Email Mining"], ["users", "Users"], ["find", "Find Professors"], ["professors", "Professors"],
  ["compose", "Compose"], ["templates", "Templates"], ["attachments", "Attachments"], ["history", "Schedule & History"],
];
// Titles for the navbar (includes settings, which isn't in the sidebar).
const TITLES: Record<string, string> = {
  dashboard: "Dashboard", emails: "Email Mining", users: "Users", find: "Find Professors", professors: "Professors",
  compose: "Compose", templates: "Templates", attachments: "Attachments", history: "Schedule & History", settings: "Settings",
};

export default function Dashboard() {
  const [section, setSection] = useState("dashboard");
  const [toast, setToastMsg] = useState<string | null>(null);
  const [foot, setFoot] = useState("");
  const [me, setMe] = useState<{ name: string; email: string }>({ name: "", email: "" });
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [acctOpen, setAcctOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const showToast = useCallback((m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2200); }, []);
  const signOut = async () => { await supabaseBrowser().auth.signOut(); location.reload(); };
  const isAdmin = role === "admin";

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      const u = data.user;
      const email = u?.email || "";
      const name = (u?.user_metadata?.full_name as string) || email.split("@")[0] || "Account";
      setMe({ name, email });
    });
    api("/api/dashboard").then((d) => setRole(d.role === "admin" ? "admin" : "user")).catch(() => setRole("user"));
    try {
      const saved = localStorage.getItem("sb_theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("sb_theme", theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    if (role === null) return;
    if (!isAdmin && (section === "emails" || section === "users")) setSection("dashboard");
  }, [role, isAdmin, section]);

  const sections = useMemo(
    () => SECTIONS_BASE.filter(([id]) => {
      if (id === "emails" || id === "users") return isAdmin;
      return true;
    }),
    [isAdmin],
  );

  const props = { toast: showToast, setFoot, go: setSection, isAdmin };
  const TABS: Record<string, React.FC<any>> = {
    dashboard: DashboardHome, compose: Compose, professors: Professors, find: FindProfessors,
    templates: Templates, attachments: Attachments, history: History, emails: EmailHarvest, users: AdminUsers, settings: Settings,
  };
  // Keep-alive: once a tab is opened, keep it mounted and just toggle its
  // visibility. This preserves each tab's state (search results, in-memory file
  // uploads, form inputs) across tab switches and avoids refetching on return.
  const [visited, setVisited] = useState<Set<string>>(() => new Set([section]));
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    setVisited((v) => (v.has(section) ? v : new Set(v).add(section)));
  }, [section]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNavOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);

  const goSection = (id: string) => {
    setSection(id);
    setNavOpen(false);
  };

  const title = TITLES[section] || "Dashboard";

  return (
    <div className={"app" + (navOpen ? " nav-open" : "")}>
      {navOpen && (
        <button type="button" className="side-backdrop" aria-label="Close menu" onClick={() => setNavOpen(false)} />
      )}
      <aside className={"side" + (navOpen ? " open" : "")}>
        <div className="brand"><div className="logo"><BrandLogo variant="app" size={34} priority /></div><div><b>ScholarBridge</b><span>AI outreach scheduler</span></div></div>
        <nav className="nav">
          {sections.map(([id, label]) => (
            <button key={id} className={id === section ? "on" : ""} onClick={() => goSection(id)}>
              <span className="nav-ic">{NAV_ICONS[id]}</span> {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main" style={{ padding: 0 }}>
        {/* Top navbar */}
        <div className="navbar">
          <button
            type="button"
            className="nav-burger"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          >
            {navOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
          <div className="nav-title">{title}</div>
          <div className="nav-right">
            {(() => {
              const moon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
              const sun = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.5 3.5M20.5 20.5 19 19M19 5l1.5-1.5M3.5 20.5 5 19" /></svg>;
              return (
                <button className={"theme-toggle" + (theme === "light" ? " light" : "")} role="switch" aria-checked={theme === "light"} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  <span className="tt-ic tt-moon">{moon}</span>
                  <span className="tt-ic tt-sun">{sun}</span>
                  <span className="tt-knob">{theme === "dark" ? moon : sun}</span>
                </button>
              );
            })()}
            <button className="acct-btn" onClick={() => setAcctOpen((o) => !o)}>
              <span className="acct-avatar">{(me.name || "?").slice(0, 1).toUpperCase()}</span>
              <span className="acct-name">{me.name || "Account"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {acctOpen && (
              <>
                <button type="button" aria-hidden className="tpf-backdrop" onClick={() => setAcctOpen(false)} />
                <div className="acct-menu">
                  <div className="am-email">{me.email || "Signed in"}</div>
                  <button onClick={() => { goSection("settings"); setAcctOpen(false); }}>{NAV_ICONS.settings} Settings</button>
                  <button onClick={signOut}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg> Sign out</button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="main-pad">
          {Object.entries(TABS).map(([id, Comp]) =>
            visited.has(id) && ((id !== "emails" && id !== "users") || isAdmin) ? (
              <div key={id} style={{ display: id === section ? "block" : "none" }}>
                <Comp {...props} />
              </div>
            ) : null,
          )}
        </div>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ---------- Dashboard home ---------- */
const DIC = {
  scheduled: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  sent: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>,
  failed: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></svg>,
  quota: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9" /><path d="M12 7v5l3 2" /></svg>,
  total: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="m3 8 9 6 9-6" /></svg>,
  papers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" /></svg>,
  countries: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" /></svg>,
  high: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4" /><path d="M12 3 4 6v5c0 5 3.4 7.8 8 10c4.6-2.2 8-5 8-10V6z" /></svg>,
};
function DashboardHome({ go, toast, isAdmin }: any) {
  const [d, setD] = useState<any>(null);
  const [mine, setMine] = useState<any>(null);
  const load = useCallback(async () => {
    const dash = await api("/api/dashboard").catch(() => null);
    if (dash) setD(dash);
    // Gate on both parent prop and API role so non-admins never see mining stats.
    const admin = isAdmin && dash?.role === "admin";
    if (admin) {
      const m = await api("/api/admin/harvest/stats").catch(() => null);
      setMine(m);
    } else setMine(null);
  }, [isAdmin]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Loader page />;
  const showMining = isAdmin && d.role === "admin" && !!mine;
  const s = d.stats;
  const card = (icon: React.ReactNode, n: number, l: string) => (
    <div className="dash-card" onClick={() => go("history")}>
      <div className="dc-top"><span className="dc-ic">{icon}</span></div>
      <div><div className="dc-n">{Number(n).toLocaleString()}</div><div className="dc-l">{l}</div></div>
    </div>
  );

  // Simple bar graph of the pipeline.
  const bars = [
    { label: "Scheduled", val: s.scheduled }, { label: "Sent", val: s.sent },
    { label: "Failed", val: s.failed }, { label: "Paused", val: s.paused }, { label: "Drafts", val: s.draft },
  ];
  const max = Math.max(1, ...bars.map((b) => b.val));

  return (
    <>
      <div className="row" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
        <RefreshButton onClick={async () => { await load(); toast?.("Refreshed"); }} />
      </div>
      {d.gmail?.needs_reconnect && <GmailReconnectBanner />}
      <div className="dash-grid">
        {card(DIC.scheduled, s.scheduled, "Scheduled")}
        {card(DIC.sent, s.sent, "Sent")}
        {card(DIC.failed, s.failed, "Failed")}
        {card(DIC.quota, s.remaining_quota, "Quota left")}
      </div>

      <div className="graph-card" style={{ marginTop: 16 }}>
        <b>Pipeline overview</b>
        <div className="bars">
          {bars.map((b) => (
            <div className="bar-col" key={b.label}>
              <div className="bar-val">{b.val}</div>
              <div className="bar" style={{ height: `${Math.round((b.val / max) * 100)}%` }} />
              <div className="bar-lbl">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {showMining && (() => {
        const totalEmails = Number(mine.total || 0);
        const totalPapers = (mine.countries || []).reduce((a: number, c: any) => a + Number(c.papers || 0), 0);
        const countriesCovered = (mine.countries || []).filter((c: any) => Number(c.cached) > 0).length;
        const highConf = Number(mine.high || 0);
        const gbars = (mine.countries || []).filter((c: any) => c.cached > 0).sort((a: any, b: any) => b.cached - a.cached).slice(0, 6);
        const gmax = Math.max(1, ...gbars.map((c: any) => Number(c.cached)));
        return (
          <>
            <div className="row" style={{ justifyContent: "space-between", margin: "22px 0 12px" }}>
              <b style={{ fontSize: 16 }}>Email mining</b>
              <button className="btn sm sec" onClick={() => go("emails")}>Open Email Mining →</button>
            </div>
            <div className="dash-grid">
              <div className="dash-card" onClick={() => go("emails")}>
                <div className="dc-top"><span className="dc-ic">{DIC.total}</span></div>
                <div><div className="dc-n">{totalEmails.toLocaleString()}</div><div className="dc-l">Emails mined</div></div>
              </div>
              <div className="dash-card" onClick={() => go("emails")}>
                <div className="dc-top"><span className="dc-ic">{DIC.papers}</span></div>
                <div><div className="dc-n">{totalPapers.toLocaleString()}</div><div className="dc-l">Papers scanned</div></div>
              </div>
              <div className="dash-card" onClick={() => go("emails")}>
                <div className="dc-top"><span className="dc-ic">{DIC.countries}</span></div>
                <div><div className="dc-n">{countriesCovered.toLocaleString()}</div><div className="dc-l">Countries covered</div></div>
              </div>
              <div className="dash-card" onClick={() => go("emails")}>
                <div className="dc-top"><span className="dc-ic">{DIC.high}</span></div>
                <div><div className="dc-n">{highConf.toLocaleString()}</div><div className="dc-l">High-confidence</div></div>
              </div>
            </div>
            {gbars.length > 0 && (
              <div className="graph-card" style={{ marginTop: 16 }}>
                <b>Emails by country</b>
                <div className="bars">
                  {gbars.map((c: any) => (
                    <div className="bar-col" key={c.country}>
                      <div className="bar-val">{Number(c.cached).toLocaleString()}</div>
                      <div className="bar" style={{ height: `${Math.round((Number(c.cached) / gmax) * 100)}%` }} />
                      <div className="bar-lbl">{cname(c.country)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
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
  const [perSlot, setPerSlot] = useState<number | "">(5);
  const [spread, setSpread] = useState(true);
  const [tz, setTz] = useState(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } });
  const toggleDate = (k: string) => setDates((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [pickAtt, setPickAtt] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [bucketId, setBucketId] = useState("");
  const [tone, setTone] = useState("default");
  const [aiOff, setAiOff] = useState(false); // true when OPENROUTER_API_KEY isn't set
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [menuIdx, setMenuIdx] = useState<number | null>(null);

  const patchEmail = (i: number, patch: any) => setPreview((p) => p.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const removeEmail = (i: number) => { setPreview((p) => p.filter((_, idx) => idx !== i)); setEditIdx(null); };

  // Reload the dropdown lists (templates / buckets / professors / attachments).
  const loadLists = () => {
    api("/api/templates").then(setTpls).catch(() => {});
    api("/api/professors").then(setProfs).catch(() => {});
    api("/api/attachments").then(setAtts).catch(() => {});
    api("/api/buckets").then(setBuckets).catch(() => {});
  };
  useEffect(() => { loadLists(); }, []);
  // Auto-refresh when returning to the tab, so newly-created templates/buckets show up.
  useEffect(() => {
    const onFocus = () => loadLists();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);

  const runAI = async () => {
    setBusy(true); setStatus("Researching & writing…");
    const fd = new FormData(); if (file) fd.append("file", file);
    fd.append("template_id", tplId); fd.append("subject", subj); fd.append("search_topics", searchTopics); fd.append("tone", tone); fd.append("professor_ids", "[]");
    if (!file && bucketId) fd.append("bucket_id", bucketId);
    try { const j = await api("/api/compose/ai", { method: "POST", body: fd }); setPreview(j.emails); setAiOff(j.ai_enabled === false); setStatus(`${j.emails.length} drafted`); }
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
    const slotCount = typeof perSlot === "number" && perSlot > 0 ? perSlot : 1;
    const slots = ds.map((d) => { const t = sameTime ? oneTime : (perDateTimes[d] || oneTime); return { date: d, hour: t.hour, minute: t.minute }; });
    if (slots.length * slotCount < preview.length) { setStatus(`Only ${slots.length * slotCount} slot(s) for ${preview.length} emails — add dates or raise per-slot.`); return; }
    setBusy(true); setStatus("");
    const schedule = { slots, per_slot: slotCount, spread, timezone: tz };
    try { const j = await api("/api/schedule/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: preview, schedule, attachment_ids: pickAtt }) }); toast(`Scheduled ${j.scheduled}`); setPreview([]); go("history"); }
    catch (e: any) { setStatus("Error: " + e.message); } setBusy(false);
  };

  return (
    <>
      <p className="lead">Draft and preview emails, then schedule them into your time slots.</p>
      <div className="tabs">
        {[["ai", "AI Personalization"], ["ready_doc", "Ready email import"], ["excel_ready", "Excel ready"]].map(([m, l]) => (
          <button key={m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setPreview([]); setFile(null); }}>{l}</button>
        ))}
      </div>
      {mode === "ai" ? (
        <div className="card">
          {aiOff && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, marginBottom: 12, borderRadius: 10, border: "1px solid var(--bad, #ef4444)", background: "rgba(239,68,68,.08)" }}>
              <span style={{ color: "var(--bad, #ef4444)", flexShrink: 0 }}>⚠</span>
              <div className="tiny">
                <b>AI writing is OFF.</b> Emails are using the basic offline template, so tone has no effect and wording is generic. Set at least one of <code>GEMINI_API_KEY</code>, <code>GROQ_API_KEY</code>, or <code>OPENROUTER_API_KEY</code> (and redeploy) to turn on real AI personalization.
              </div>
            </div>
          )}
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
          <div className="row" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
            <RefreshButton onClick={async () => { loadLists(); toast("Lists refreshed"); }} />
          </div>
          <div className="grid g2">
            <div>
              <label>Professor bucket (from your saved professors)</label>
              <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} disabled={!!file}>
                <option value="">{profs.length ? `All saved professors (${profs.length})` : "No saved professors"}</option>
                {buckets.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.count})</option>)}
              </select>
              <div className="mut tiny" style={{ marginTop: 6 }}>Pick a bucket, or leave on &ldquo;All saved&rdquo;. Uploading a file below overrides this.</div>
            </div>
            <div>
              <label>Subject override (optional)</label>
              <input value={subj} onChange={(e) => setSubj(e.target.value)} placeholder="Prospective Research Student - {{subject_line}}" />
              <div className="mut tiny" style={{ marginTop: 6 }}>Include <code>{"{{subject_line}}"}</code> for an AI, per-professor line. Blank uses the template / default subject.</div>
            </div>
          </div>
          <label style={{ marginTop: 14 }}>Or upload an Excel/CSV instead</label>
          <FileDrop file={file} onFile={setFile} accept=".xlsx,.xls,.csv" hint="XLSX, XLS or CSV file" />
          <div className="grid g2" style={{ marginTop: 14 }}>
            <div><label>Template</label><select value={tplId} onChange={(e) => setTplId(e.target.value)}><option value="">Built-in default</option>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label>Email tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                {[["default", "Default"], ["short", "Short"], ["long", "Long"], ["warm", "Warm"], ["friendly", "Friendly"], ["polite", "Polite"], ["professional", "Professional"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div className="mut tiny" style={{ marginTop: 6 }}>Steers the length &amp; feel of the AI paragraph.</div>
            </div>
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
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <b>{e.professor_name || e.email || "(no recipient)"}</b>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    {editIdx === i && <button className="btn sm" onClick={() => setEditIdx(null)}>Done</button>}
                    <div style={{ position: "relative" }}>
                      <button className="kebab" aria-label="More actions" onClick={() => setMenuIdx(menuIdx === i ? null : i)}>⋮</button>
                      {menuIdx === i && (
                        <>
                          <div className="menu-backdrop" onClick={() => setMenuIdx(null)} />
                          <div className="menu">
                            <button onClick={() => { setEditIdx(i); setMenuIdx(null); }}>Edit</button>
                            <button className="danger" onClick={() => { removeEmail(i); setMenuIdx(null); }}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {e.papers_used?.length ? <div className="tiny mut" style={{ marginTop: 4 }}>Papers: {e.papers_used.map((t: string) => String(t || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" · ")}</div> : null}
                {editIdx === i ? (
                  <div style={{ marginTop: 8 }}>
                    <label>Recipient email</label>
                    <input value={e.email || ""} onChange={(ev) => patchEmail(i, { email: ev.target.value })} placeholder="prof@uni.edu" />
                    <label style={{ marginTop: 10 }}>Subject</label>
                    <input value={e.subject || ""} onChange={(ev) => patchEmail(i, { subject: ev.target.value })} />
                    <label style={{ marginTop: 10 }}>Body</label>
                    <RichText value={e.body || ""} onChange={(html) => patchEmail(i, { body: html })} />
                  </div>
                ) : (
                  <>
                    <div className="mut tiny" style={{ marginTop: 4 }}>{e.email}</div>
                    <div style={{ marginTop: 6 }}><b>Subject:</b> {e.subject}</div>
                    {looksHtml(e.body) ? <div className="email-html" dangerouslySetInnerHTML={{ __html: e.body }} /> : <pre>{e.body}</pre>}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="card">
            <b>Schedule</b>
            <div className="mut tiny" style={{ margin: "4px 0 14px" }}>Pick the dates to send on, set the time, then schedule. {preview.length} email(s) to place · {[...dates].length * (typeof perSlot === "number" && perSlot > 0 ? perSlot : 1)} slot(s) available.</div>

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
                  <div>
                    <label>Per slot</label>
                    <input
                      type="number"
                      min={1}
                      value={perSlot}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") setPerSlot("");
                        else {
                          const n = parseInt(v, 10);
                          setPerSlot(Number.isFinite(n) ? n : "");
                        }
                      }}
                      onBlur={() => {
                        if (perSlot === "" || (typeof perSlot === "number" && perSlot < 1)) setPerSlot(1);
                      }}
                    />
                  </div>
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
const NEW_BUCKET = "__new__";
// Full-screen modal shell reused by the professor add/edit/upload/confirm popups.
function ModalShell({
  onClose,
  maxWidth = 460,
  title,
  children,
  bodyStyle,
}: {
  onClose: () => void;
  maxWidth?: number;
  title?: React.ReactNode;
  children: React.ReactNode;
  bodyStyle?: React.CSSProperties;
}) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth, maxHeight: "88vh", overflow: "auto", padding: 18, marginBottom: 0, ...bodyStyle }}
      >
        {title ? <b style={{ fontSize: 15, flexShrink: 0 }}>{title}</b> : null}
        {children}
      </div>
    </div>
  );
}

// Bucket picker (existing bucket or create a new one) used across the modals.
function BucketSelect({ value, onChange, buckets, newName, setNewName }: any) {
  const creating = value === NEW_BUCKET;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: creating ? "0 0 150px" : "1 1 auto", minWidth: 120, height: 36 }}>
        <option value="">No bucket</option>
        {buckets.map((b: any) => <option key={b.id} value={b.id}>{b.name} ({b.count})</option>)}
        <option value={NEW_BUCKET}>＋ New bucket…</option>
      </select>
      {creating && <input placeholder="New bucket name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: "1 1 auto", minWidth: 100, height: 36 }} autoFocus />}
    </div>
  );
}

// { bucket_id } | { bucket_name } | {} from a BucketSelect value.
function bucketPayload(value: string, newName: string) {
  if (value === NEW_BUCKET) return newName.trim() ? { bucket_name: newName.trim() } : {};
  return value ? { bucket_id: value } : {};
}

function ConfirmModal({ title, message, confirmLabel = "Delete", danger = true, onConfirm, onClose }: any) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell onClose={onClose} maxWidth={400} title={title}>
      <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>{message}</p>
      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={"btn sm" + (danger ? " danger" : "")} disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } catch { setBusy(false); } }}>{busy ? "Working…" : confirmLabel}</button>
      </div>
    </ModalShell>
  );
}

// Add or edit a professor (edit when `initial.id` is present).
function ProfessorFormModal({ initial, buckets, onClose, onSaved, toast }: any) {
  const editing = !!initial?.id;
  const [m, setM] = useState({ name: initial?.name || "", email: initial?.email || "", university: initial?.university || "", topics: initial?.topics || "" });
  const [bucket, setBucket] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!m.email.includes("@")) { setError("A valid email is required."); return; }
    setBusy(true); setError("");
    const body = editing ? { ...m, id: initial.id } : { ...m, ...bucketPayload(bucket, newName) };
    try {
      const j = await api("/api/professors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (j.duplicate) toast(j.bucketed ? "Already saved — added to bucket" : "Already exists");
      else toast(editing ? "Professor updated" : "Professor added");
      onSaved();
    } catch (e) { setError((e as Error)?.message || "Save failed"); setBusy(false); }
  };
  return (
    <ModalShell onClose={onClose} maxWidth={440} title={editing ? "Edit professor" : "Add professor"}>
      {!editing && (
        <div style={{ marginTop: 12 }}>
          <label>Add to bucket (optional)</label>
          <BucketSelect value={bucket} onChange={setBucket} buckets={buckets} newName={newName} setNewName={setNewName} />
        </div>
      )}
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {(["name", "email", "university", "topics"] as const).map((k) => (
          <div key={k}>
            <label>{k === "topics" ? "Topics / field" : k[0].toUpperCase() + k.slice(1)}</label>
            <input value={(m as any)[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} placeholder={k === "email" ? "name@university.edu" : ""} />
          </div>
        ))}
      </div>
      {error && <div className="tiny" style={{ color: "var(--bad)", marginTop: 10 }}>{error}</div>}
      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn sm" onClick={submit} disabled={busy}>{busy ? "Saving…" : editing ? "Update professor" : "Add professor"}</button>
      </div>
    </ModalShell>
  );
}

// Upload a spreadsheet of professors.
function UploadModal({ buckets, onClose, onDone, toast }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [bucket, setBucket] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [st, setSt] = useState("");
  const upload = async () => {
    if (!file) { setSt("Choose a file first."); return; }
    const fd = new FormData(); fd.append("file", file);
    const bf: any = bucketPayload(bucket, newName);
    if (bf.bucket_id) fd.append("bucket_id", bf.bucket_id);
    if (bf.bucket_name) fd.append("bucket_name", bf.bucket_name);
    setBusy(true); setSt("Uploading…");
    try { const j = await api("/api/professors/upload", { method: "POST", body: fd }); toast(`Added ${j.added}, skipped ${j.duplicates}`); onDone(); }
    catch (e) { setSt((e as Error)?.message || "Upload failed"); setBusy(false); }
  };
  return (
    <ModalShell onClose={onClose} maxWidth={460} title="Upload professors">
      <div style={{ marginTop: 12 }}>
        <label>Add to bucket (optional)</label>
        <BucketSelect value={bucket} onChange={setBucket} buckets={buckets} newName={newName} setNewName={setNewName} />
      </div>
      <div className="mut tiny" style={{ margin: "14px 0 10px" }}>XLSX, XLS or CSV with Name and Email columns. A &ldquo;Field&rdquo; or &ldquo;Area&rdquo; column is read as topics.</div>
      <FileDrop file={file} onFile={setFile} accept=".xlsx,.xls,.csv" hint="XLSX, XLS or CSV file" />
      {st && <div className="tiny" style={{ marginTop: 8, color: /fail|Choose/.test(st) ? "var(--bad)" : "var(--mut)" }}>{st}</div>}
      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn sm" onClick={upload} disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      </div>
    </ModalShell>
  );
}

// Assign selected professors to a bucket.
function BucketAssignModal({ buckets, ids, onClose, onDone, toast }: any) {
  const [bucket, setBucket] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    const bf: any = bucketPayload(bucket, newName);
    if (!bf.bucket_id && !bf.bucket_name) { setError("Pick or name a bucket."); return; }
    setBusy(true); setError("");
    try { await api("/api/buckets/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ professor_ids: ids, ...bf }) }); toast(`Added ${ids.length} to bucket`); onDone(); }
    catch (e) { setError((e as Error)?.message || "Failed"); setBusy(false); }
  };
  return (
    <ModalShell onClose={onClose} maxWidth={420} title={`Add ${ids.length} to a bucket`}>
      <div style={{ marginTop: 12 }}><BucketSelect value={bucket} onChange={setBucket} buckets={buckets} newName={newName} setNewName={setNewName} /></div>
      {error && <div className="tiny" style={{ color: "var(--bad)", marginTop: 10 }}>{error}</div>}
      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn sm" onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add to bucket"}</button>
      </div>
    </ModalShell>
  );
}

/** Rename a bucket and set its full professor membership via checklist. */
function EditBucketModal({ bucket, professors, onClose, onDone, toast }: any) {
  const [name, setName] = useState(bucket.name || "");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api(`/api/buckets/${bucket.id}/members`)
      .then((j) => {
        setChecked(new Set(j.professor_ids || []));
        if (j.bucket?.name) setName(j.bucket.name);
        setReady(true);
      })
      .catch((e) => {
        setError((e as Error)?.message || "Could not load members");
        setReady(true);
      });
  }, [bucket.id]);

  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Bucket name required"); return; }
    setBusy(true); setError("");
    try {
      if (trimmed !== bucket.name) {
        await api(`/api/buckets/${bucket.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
      }
      await api(`/api/buckets/${bucket.id}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professor_ids: [...checked] }),
      });
      toast("Bucket updated");
      onDone();
    } catch (e) {
      setError((e as Error)?.message || "Failed");
      setBusy(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      maxWidth={520}
      title="Edit bucket"
      bodyStyle={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 0 }}
    >
      <label style={{ marginTop: 12, flexShrink: 0 }}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", flexShrink: 0 }} />
      <label style={{ marginTop: 14, flexShrink: 0 }}>Professors in this bucket</label>
      <div className="mut tiny" style={{ marginBottom: 8, flexShrink: 0 }}>Check to add, uncheck to remove. Professors themselves are not deleted.</div>
      {!ready ? (
        <div className="mut tiny">Loading…</div>
      ) : (
        <div style={{ flex: "1 1 auto", minHeight: 120, maxHeight: "min(48vh, 380px)", overflow: "auto", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>
          {(professors || []).length === 0 ? (
            <div className="mut tiny">No saved professors yet.</div>
          ) : (
            (professors || []).map((p: any) => (
              <label key={p.id} className="chk" style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", padding: "6px 2px", fontSize: 13 }}>
                <input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} style={{ marginTop: 3 }} />
                <span>
                  <b>{p.name || p.email}</b>
                  <div className="mut tiny">{p.email}{p.university ? ` · ${p.university}` : ""}</div>
                </span>
              </label>
            ))
          )}
        </div>
      )}
      <div className="mut tiny" style={{ marginTop: 8, flexShrink: 0 }}>{checked.size} selected</div>
      {error && <div className="tiny" style={{ color: "var(--bad)", marginTop: 10, flexShrink: 0 }}>{error}</div>}
      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16, flexShrink: 0 }}>
        <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn sm" onClick={submit} disabled={busy || !ready}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </ModalShell>
  );
}

/** Create a new bucket and optionally assign professors via checklist. */
function CreateBucketModal({ professors, initialIds, onClose, onDone, toast }: any) {
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initialIds || []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Bucket name required"); return; }
    setBusy(true); setError("");
    try {
      const bucket = await api("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (checked.size) {
        await api(`/api/buckets/${bucket.id}/members`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professor_ids: [...checked] }),
        });
      }
      toast(checked.size ? `Bucket created · ${checked.size} added` : "Bucket created");
      onDone(bucket.id);
    } catch (e) {
      setError((e as Error)?.message || "Failed");
      setBusy(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      maxWidth={520}
      title="New bucket"
      bodyStyle={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 0 }}
    >
      <label style={{ marginTop: 12, flexShrink: 0 }}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Japan ML labs" style={{ width: "100%", flexShrink: 0 }} autoFocus />
      <label style={{ marginTop: 14, flexShrink: 0 }}>Add professors</label>
      <div className="mut tiny" style={{ marginBottom: 8, flexShrink: 0 }}>Optional — check professors to put in this bucket.</div>
      <div style={{ flex: "1 1 auto", minHeight: 120, maxHeight: "min(48vh, 380px)", overflow: "auto", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>
        {(professors || []).length === 0 ? (
          <div className="mut tiny">No saved professors yet. You can still create an empty bucket.</div>
        ) : (
          (professors || []).map((p: any) => (
            <label key={p.id} className="chk" style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", padding: "6px 2px", fontSize: 13 }}>
              <input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} style={{ marginTop: 3 }} />
              <span>
                <b>{p.name || p.email}</b>
                <div className="mut tiny">{p.email}{p.university ? ` · ${p.university}` : ""}</div>
              </span>
            </label>
          ))
        )}
      </div>
      <div className="mut tiny" style={{ marginTop: 8, flexShrink: 0 }}>{checked.size} selected</div>
      {error && <div className="tiny" style={{ color: "var(--bad)", marginTop: 10, flexShrink: 0 }}>{error}</div>}
      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16, flexShrink: 0 }}>
        <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn sm" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create bucket"}</button>
      </div>
    </ModalShell>
  );
}

function Professors({ toast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bucketView, setBucketView] = useState("__all__"); // __all__ | bucket id | __none__
  const [searchQ, setSearchQ] = useState("");
  const [modal, setModal] = useState<any>(null); // {type:"add"|"edit"|"upload"|"assign"|"confirm", ...}
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const trunc = (s: string, n = 48) => (s && s.length > n ? s.slice(0, n).trimEnd() + "…" : (s || ""));
  const bucketName = (id: string) => buckets.find((b) => b.id === id)?.name || "";
  const activeBucket = buckets.find((b) => b.id === bucketView) || null;
  const load = () => {
    api("/api/professors").then((x) => { setList(x); setLoading(false); setSel(new Set()); });
    api("/api/buckets").then((bs) => {
      setBuckets(bs);
      setBucketView((v) => (v === "__all__" || v === "__none__" || bs.some((b: any) => b.id === v) ? v : "__all__"));
    }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const isAll = bucketView === "__all__";
  const shown = useMemo(() => {
    let rows = list;
    if (!isAll) {
      if (bucketView === "__none__") rows = rows.filter((p) => !(p.bucket_ids || []).length);
      else rows = rows.filter((p) => (p.bucket_ids || []).includes(bucketView));
    }
    const q = searchQ.trim().toLowerCase();
    if (q) {
      rows = rows.filter((p) =>
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.email || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [list, bucketView, isAll, searchQ]);
  useEffect(() => { setPage(1); }, [bucketView, searchQ]);
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  const pageC = Math.min(page, pageCount);
  const paged = shown.slice((pageC - 1) * pageSize, pageC * pageSize);

  const del = async (id: string) => { await api("/api/professors/" + id, { method: "DELETE" }); load(); };
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allChecked = paged.length > 0 && paged.every((p) => sel.has(p.id));
  const toggleAll = () => setSel((s) => (paged.every((p) => s.has(p.id)) ? new Set([...s].filter((id) => !paged.some((p) => p.id === id))) : new Set([...s, ...paged.map((p) => p.id)])));
  const bulkDelete = async () => {
    await api("/api/professors/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...sel] }) });
    toast(`Deleted ${sel.size}`); load();
  };
  const delBucket = async (id: string) => {
    if (!confirm(`Delete bucket "${bucketName(id)}"? Professors stay; only the grouping is removed.`)) return;
    await api("/api/buckets/" + id, { method: "DELETE" });
    setBucketView("__all__");
    load();
  };
  const closeAndReload = () => { setModal(null); load(); };
  const openCreateBucket = () => setModal({ type: "createBucket", ids: [...sel] });
  const afterCreateBucket = (id?: string) => {
    setModal(null);
    if (id) setBucketView(id);
    load();
  };

  return (
    <>
      <p className="lead">Add professors manually or from a spreadsheet, and sort them into buckets you can target when composing.</p>

      <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn sm" onClick={() => setModal({ type: "add" })}>＋ Add professor</button>
        <button className="btn sm sec" onClick={() => setModal({ type: "upload" })}>Upload file</button>
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search name or email…"
          aria-label="Search professors by name or email"
          style={{ maxWidth: 220, height: 38, padding: "8px 12px" }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="mut tiny" htmlFor="prof-buckets" style={{ margin: 0 }}>Buckets</label>
          <select
            id="prof-buckets"
            className="pagesize"
            value={bucketView}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__new__") { openCreateBucket(); return; }
              setBucketView(v);
            }}
            style={{ minWidth: 160 }}
            aria-label="Filter by bucket"
          >
            <option value="__all__">All ({list.length})</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.count})</option>
            ))}
            <option value="__none__">Ungrouped</option>
            <option value="__new__">＋ New bucket…</option>
          </select>
          <button className="btn sm sec" title="Create a new bucket" onClick={openCreateBucket}>＋ Bucket</button>
          {activeBucket && (
            <>
              <button className="btn sm sec" title="Edit bucket" onClick={() => setModal({ type: "editBucket", bucket: activeBucket })}>Edit</button>
              <button className="btn sm danger" title="Delete bucket" onClick={() => delBucket(activeBucket.id)}>Delete</button>
            </>
          )}
          <RefreshButton onClick={async () => { load(); toast("Refreshed"); }} />
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="pagesize" aria-label="Results per page">
            {[20, 50, 100, 200, 500, 1000].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {sel.size > 0 && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <b>{sel.size} selected</b>
          <button className="btn sm" onClick={() => setModal({ type: "assign", ids: [...sel] })}>Add to bucket</button>
          <button className="btn sm danger" onClick={() => setModal({ type: "confirmBulk" })}>Delete selected</button>
          <button className="btn sm sec" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      <div className="card">{loading ? <Loader /> : shown.length ? (<>
        <div className="table-wrap"><table><thead><tr><th style={{ width: 28 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th><th style={{ width: 40 }}>#</th><th>Name</th><th>Email</th><th>University/Lab</th><th style={{ minWidth: 150 }}>Buckets</th><th style={{ minWidth: 200 }}>Topics / Field</th><th style={{ width: 44 }} /></tr></thead><tbody>
          {paged.map((p, i) => (
            <tr key={p.id}>
              <td style={{ verticalAlign: "top" }}><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} /></td>
              <td className="mut" style={{ verticalAlign: "top" }}>{(pageC - 1) * pageSize + i + 1}</td>
              <td style={{ verticalAlign: "top" }}><b>{p.name}</b></td>
              <td style={{ verticalAlign: "top" }}>{p.email}</td>
              <td style={{ verticalAlign: "top" }}>{p.university}</td>
              <td style={{ verticalAlign: "top" }}>{(p.bucket_ids || []).length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{(p.bucket_ids || []).map((id: string) => <span key={id} className="btag">{bucketName(id)}</span>)}</div> : <span className="mut tiny">—</span>}</td>
              <td className="mut" style={{ verticalAlign: "top" }} title={p.topics || ""}>{trunc(p.topics, 48)}</td>
              <td style={{ verticalAlign: "top" }}><RowMenu items={[{ label: "Edit", onClick: () => setModal({ type: "edit", prof: p }) }, { label: "Delete", onClick: () => setModal({ type: "confirm", prof: p }), danger: true }]} /></td>
            </tr>
          ))}
        </tbody></table></div>
        {pageCount > 1 && (
          <div className="row" style={{ justifyContent: "center", marginTop: 14, gap: 10 }}>
            <button className="btn sm sec" disabled={pageC <= 1} onClick={() => setPage(pageC - 1)}>&larr; Prev</button>
            <span className="mut">Page {pageC} of {pageCount} · {shown.length} total</span>
            <button className="btn sm sec" disabled={pageC >= pageCount} onClick={() => setPage(pageC + 1)}>Next &rarr;</button>
          </div>
        )}
        </>) : <div className="mut">{searchQ.trim() ? "No professors match your search." : isAll ? "No professors yet." : "No professors in this bucket."}</div>}</div>

      {modal?.type === "add" && <ProfessorFormModal buckets={buckets} onClose={() => setModal(null)} onSaved={closeAndReload} toast={toast} />}
      {modal?.type === "edit" && <ProfessorFormModal initial={modal.prof} buckets={buckets} onClose={() => setModal(null)} onSaved={closeAndReload} toast={toast} />}
      {modal?.type === "upload" && <UploadModal buckets={buckets} onClose={() => setModal(null)} onDone={closeAndReload} toast={toast} />}
      {modal?.type === "assign" && <BucketAssignModal buckets={buckets} ids={modal.ids} onClose={() => setModal(null)} onDone={closeAndReload} toast={toast} />}
      {modal?.type === "editBucket" && <EditBucketModal bucket={modal.bucket} professors={list} onClose={() => setModal(null)} onDone={closeAndReload} toast={toast} />}
      {modal?.type === "createBucket" && <CreateBucketModal professors={list} initialIds={modal.ids} onClose={() => setModal(null)} onDone={afterCreateBucket} toast={toast} />}
      {modal?.type === "confirm" && <ConfirmModal title="Delete professor?" message={`Remove ${modal.prof.name || modal.prof.email} from your list? This can't be undone.`} onConfirm={async () => { await del(modal.prof.id); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.type === "confirmBulk" && <ConfirmModal title={`Delete ${sel.size} professors?`} message="Remove all selected professors from your list? This can't be undone." onConfirm={async () => { await bulkDelete(); setModal(null); }} onClose={() => setModal(null)} />}
    </>
  );
}

/* ---------- Templates ---------- */
function Templates({ toast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [ed, setEd] = useState<any>({ name: "", subject: "", body: "" });
  const [loading, setLoading] = useState(true);
  const [varsOpen, setVarsOpen] = useState(false);
  const load = () => api("/api/templates").then((x) => { setList(x); setLoading(false); });
  useEffect(() => { load(); }, []);
  const save = async () => { if (!ed.name) { toast("Name required"); return; } await api("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ed) }); toast("Saved"); setEd({ name: "", subject: "", body: "" }); load(); };
  const del = async (id: string) => { await api("/api/templates/" + id, { method: "DELETE" }); load(); };
  return (
    <>
      <div className="row" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
        <RefreshButton onClick={async () => { await load(); toast("Refreshed"); }} />
      </div>
      <div className="card">
        <div onClick={() => setVarsOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
          <b>Template variables</b>
          <span className="mut tiny">&amp; AI subject tip</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mut)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", transform: varsOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="m6 9 6 6 6-6" /></svg>
        </div>
        {varsOpen && (
          <div style={{ marginTop: 12 }}>
            <div className="mut tiny">Use these tokens in your Subject and Body — each is filled in per professor.</div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {["{{professor_name}}", "{{professor_last_name}}", "{{university}}", "{{topics}}", "{{personalized}}", "{{your_name}}", "{{subject_line}}"].map((v) => (
                <code key={v} style={{ background: "var(--field)", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 8px", fontSize: 12, fontFamily: "ui-monospace, Menlo, monospace", color: "var(--ink)" }}>{v}</code>
              ))}
            </div>
            <div className="mut tiny" style={{ marginTop: 12, lineHeight: 1.6 }}>
              <b style={{ color: "var(--acc)" }}>{"{{subject_line}}"}</b> is AI-written per professor. Strong paper match: &ldquo;inspired by your work on learning movement representations from video (Action Motifs)&rdquo;. Weaker match: &ldquo;inspired by your work on pattern recognition and image analysis&rdquo; or &ldquo;excited by your AURA-MFM cross-modal retrieval work&rdquo;. Default subject: &ldquo;Prospective Research Student - {"{{subject_line}}"}&rdquo;.
            </div>
          </div>
        )}
      </div>
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
function Attachments({ toast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [kind, setKind] = useState("cv"); const [file, setFile] = useState<File | null>(null); const [st, setSt] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => api("/api/attachments").then((x) => { setList(x); setLoading(false); });
  useEffect(() => { load(); }, []);
  const up = async () => { if (!file) { setSt("Choose a file"); return; } const fd = new FormData(); fd.append("kind", kind); fd.append("file", file); await api("/api/attachments", { method: "POST", body: fd }); setSt("Uploaded"); load(); };
  const del = async (id: string) => { await api("/api/attachments/" + id, { method: "DELETE" }); load(); };
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <p className="lead" style={{ margin: 0 }}>Upload your CV, SOP or research proposal — attach them when scheduling.</p>
        <RefreshButton onClick={async () => { await load(); toast?.("Refreshed"); }} />
      </div>
      <div className="card">
        <label>Type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ maxWidth: 220 }}><option value="cv">CV</option><option value="sop">SOP</option><option value="proposal">Research proposal</option><option value="other">Other</option></select>
        <div style={{ marginTop: 12 }}><FileDrop file={file} onFile={setFile} hint="Any document — CV, SOP or proposal" /></div>
        <div className="row" style={{ marginTop: 12 }}><button className="btn sm" onClick={up}>Upload</button><span className="mut">{st}</span></div>
      </div>
      <div className="card">{loading ? <Loader /> : list.length ? (
        <div className="table-wrap"><table><thead><tr><th>File</th><th>Type</th><th>Size</th><th /></tr></thead><tbody>
          {list.map((x) => (<tr key={x.id}><td><b>{x.filename}</b></td><td><span className="pill draft">{x.kind}</span></td><td className="mut">{Math.round((x.size || 0) / 1024)} KB</td><td><button className="btn sm danger" onClick={() => del(x.id)}>Delete</button></td></tr>))}
        </tbody></table></div>) : <div className="mut">No attachments yet.</div>}</div>
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

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Themed modal (in-app calendar + time picker) to re-queue one or many
 *  cancelled/failed emails to a new time. `emails` is always an array. */
function RescheduleModal({ emails, onClose, onDone }: { emails: any[]; onClose: () => void; onDone: () => void }) {
  const init = new Date(Date.now() + 3600_000);
  const [day, setDay] = useState<string>(() => isoDay(init));
  const [time, setTime] = useState<{ hour: number; minute: number }>(() => ({ hour: init.getHours(), minute: init.getMinutes() }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bulk = emails.length > 1;
  const submit = async () => {
    setError("");
    const [y, m, d] = day.split("-").map(Number);
    const when = new Date(y, m - 1, d, time.hour, time.minute, 0, 0);
    if (isNaN(when.getTime())) { setError("Pick a valid date and time."); return; }
    if (when.getTime() < Date.now() - 60_000) { setError("Pick a time in the future."); return; }
    setBusy(true);
    try {
      for (const e of emails) {
        await api(`/api/emails/${e.id}/reschedule`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ send_at: when.toISOString() }),
        });
      }
      onDone();
    } catch (e: any) { setError(e?.message || "Could not reschedule."); setBusy(false); }
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, padding: 18 }}>
        <b style={{ fontSize: 15 }}>Reschedule {bulk ? `${emails.length} emails` : "email"}</b>
        <div className="mut tiny" style={{ marginTop: 2 }}>{bulk ? "Applies the same new time to all selected." : `To ${emails[0]?.professor_name || emails[0]?.email}`}</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start", marginTop: 14 }}>
          <div style={{ flex: "1 1 260px", minWidth: 240 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Date</label>
            <MiniCalendar selected={new Set([day])} onToggle={(k) => setDay(k)} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Time</label>
            <TimePicker value={time} onChange={setTime} />
          </div>
        </div>
        {error && <div className="tiny" style={{ color: "var(--bad)", marginTop: 10 }}>{error}</div>}
        <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn sm" onClick={submit} disabled={busy}>{busy ? "Scheduling…" : "Reschedule"}</button>
        </div>
      </div>
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
  const [reList, setReList] = useState<any[] | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [confirmProc, setConfirmProc] = useState(false);
  const PER = 20;
  const load = useCallback(() => api("/api/emails?status=" + f).then((x) => { setList(x); setLoading(false); setSel(new Set()); }), [f]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [f, query]);
  const refresh = async () => { setRefreshing(true); try { await load(); toast("Refreshed"); } finally { setRefreshing(false); } };
  const act = async (id: string, a: string) => { await api(`/api/emails/${id}/${a}`, { method: "POST" }); toast(a); load(); };
  const del = async (id: string) => { await api("/api/emails/" + id, { method: "DELETE" }); load(); };
  const proc = async () => {
    const r = await api("/api/process-due", { method: "POST" });
    toast(`Processed ${r.processed} · sent ${r.sent}`);
    setConfirmProc(false);
    load();
  };
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => `${e.professor_name || ""} ${e.email || ""} ${e.subject || ""}`.toLowerCase().includes(q));
  }, [list, query]);

  const countsByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of filtered) {
      if (!e.send_at) continue;
      const d = new Date(e.send_at);
      const k = isoDay(d);
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [filtered]);

  const dayEmails = useMemo(() => {
    if (!dayKey) return [];
    return filtered.filter((e) => e.send_at && isoDay(new Date(e.send_at)) === dayKey)
      .sort((a, b) => new Date(a.send_at).getTime() - new Date(b.send_at).getTime());
  }, [filtered, dayKey]);

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

  const emailMenuItems = (e: any) => {
    const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [];
    if (e.status === "scheduled") items.push({ label: "Pause", onClick: () => act(e.id, "pause") });
    if (e.status === "paused") items.push({ label: "Resume", onClick: () => act(e.id, "resume") });
    if (["scheduled", "paused", "draft"].includes(e.status)) items.push({ label: "Send now", onClick: () => act(e.id, "send-now") });
    if (["scheduled", "paused"].includes(e.status)) items.push({ label: "Cancel", onClick: () => act(e.id, "cancel") });
    if (["cancelled", "failed"].includes(e.status)) items.push({ label: "Reschedule", onClick: () => setReList([e]) });
    items.push({ label: "Delete", onClick: () => del(e.id), danger: true });
    return items;
  };

  const cy = calMonth.getFullYear(), cm = calMonth.getMonth();
  const firstDow = new Date(cy, cm, 1).getDay();
  const daysInMonth = new Date(cy, cm + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      <p className="lead">Every drafted, scheduled, sent and failed email — with full control.</p>
      <div className="row" style={{ marginBottom: 16, gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button className="btn sm" onClick={() => setConfirmProc(true)}>Process due now</button>
          <div style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <button type="button" className={"btn sm " + (view === "list" ? "" : "sec")} style={{ borderRadius: 0, border: "none" }} onClick={() => setView("list")}>List</button>
            <button type="button" className={"btn sm " + (view === "calendar" ? "" : "sec")} style={{ borderRadius: 0, border: "none" }} onClick={() => setView("calendar")}>Calendar</button>
          </div>
        </div>
        <div className="hist-tools-right" style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "nowrap", flexShrink: 0 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
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
          <input className="hist-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipient or subject" style={{ width: 220, maxWidth: 220, height: 34, padding: "7px 12px", flexShrink: 0 }} />
          <RefreshButton onClick={refresh} busy={refreshing} />
        </div>
      </div>
      {confirmProc && (
        <ConfirmModal
          title="Process due emails?"
          message="This sends every email whose scheduled time has already passed. Continue?"
          confirmLabel="Process now"
          danger={false}
          onConfirm={proc}
          onClose={() => setConfirmProc(false)}
        />
      )}
      {sel.size > 0 && view === "list" && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 12 }}>
          <b>{sel.size} selected</b>
          <button className="btn sm sec" onClick={() => bulk("pause")}>Pause</button>
          <button className="btn sm sec" onClick={() => bulk("resume")}>Resume</button>
          <button className="btn sm sec" onClick={() => bulk("send-now")}>Send now</button>
          <button className="btn sm sec" onClick={() => bulk("cancel")}>Cancel</button>
          <button className="btn sm sec" onClick={() => { const rows = list.filter((e) => sel.has(e.id) && ["cancelled", "failed"].includes(e.status)); if (!rows.length) { toast("Select cancelled or failed emails"); return; } setReList(rows); }}>Reschedule</button>
          <button className="btn sm danger" onClick={() => bulk("delete")}>Delete</button>
          <button className="btn sm sec" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      {view === "calendar" ? (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <button type="button" className="btn sm sec" onClick={() => setCalMonth(new Date(cy, cm - 1, 1))}>‹</button>
              <b>{calMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b>
              <button type="button" className="btn sm sec" onClick={() => setCalMonth(new Date(cy, cm + 1, 1))}>›</button>
            </div>
            {loading ? <Loader /> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="mut tiny" style={{ textAlign: "center", fontWeight: 800 }}>{d}</div>
                ))}
                {cells.map((d, i) => {
                  if (d === null) return <div key={`e${i}`} />;
                  const k = `${cy}-${String(cm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const n = countsByDay[k] || 0;
                  const on = dayKey === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDayKey(k)}
                      style={{
                        minHeight: 64, borderRadius: 10, border: on ? "1px solid var(--acc)" : "1px solid var(--line)",
                        background: on ? "rgba(34,211,238,.12)" : "var(--field)", color: "var(--ink)",
                        cursor: "pointer", padding: "8px 6px", textAlign: "left",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{d}</div>
                      {n > 0 && <div className="tiny" style={{ marginTop: 6, color: "var(--acc)", fontWeight: 800 }}>{n} email{n === 1 ? "" : "s"}</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {dayKey && (
            <DayEmailsModal
              dayKey={dayKey}
              emails={dayEmails}
              emailMenuItems={emailMenuItems}
              onClose={() => setDayKey(null)}
            />
          )}
        </>
      ) : (
      <div className="card">{loading ? <Loader /> : filtered.length ? (
        <>
        <div className="table-wrap"><table><thead><tr><th style={{ width: 28 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th><th style={{ width: 44 }}>#</th><th>When</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {paged.map((e, i) => (
            <tr key={e.id}>
              <td><input type="checkbox" checked={sel.has(e.id)} onChange={() => toggle(e.id)} aria-label="Select email" /></td>
              <td className="mut">{(pageC - 1) * PER + i + 1}</td>
              <td className="mut">{fmt(e.send_at)}</td>
              <td><b>{e.professor_name || e.email}</b><div className="mut tiny">{e.email}</div></td>
              <td>{e.subject}{e.error && <div className="tiny" style={{ color: "var(--bad)" }}>{e.error}</div>}</td>
              <td><span className={`pill ${e.status}`}>{e.status}</span></td>
              <td><RowMenu items={emailMenuItems(e)} /></td>
            </tr>
          ))}
        </tbody></table></div>
        {pageCount > 1 && (
          <div className="row" style={{ justifyContent: "center", marginTop: 14, gap: 10 }}>
            <button className="btn sm sec" disabled={pageC <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>&larr; Prev</button>
            <span className="mut">Page {pageC} of {pageCount} · {filtered.length} total</span>
            <button className="btn sm sec" disabled={pageC >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next &rarr;</button>
          </div>
        )}
        </>
      ) : <div className="mut">{query ? "No emails match your search." : "Nothing here."}</div>}</div>
      )}
      {reList && <RescheduleModal emails={reList} onClose={() => setReList(null)} onDone={() => { setReList(null); toast("rescheduled"); load(); }} />}
    </>
  );
}

function DayEmailsModal({
  dayKey,
  emails,
  emailMenuItems,
  onClose,
}: {
  dayKey: string;
  emails: any[];
  emailMenuItems: (e: any) => Array<{ label: string; onClick: () => void; danger?: boolean }>;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return emails;
    return emails.filter((e) => `${e.professor_name || ""} ${e.email || ""} ${e.subject || ""}`.toLowerCase().includes(s));
  }, [emails, q]);
  const title = new Date(dayKey + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });
  return (
    <ModalShell onClose={onClose} maxWidth={780} title={`${title} · ${emails.length} email(s)`} bodyStyle={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search recipient or subject"
        style={{ width: "100%", marginTop: 12, marginBottom: 10, flexShrink: 0 }}
      />
      <div style={{ flex: "1 1 auto", minHeight: 120, maxHeight: "min(55vh, 420px)", overflow: "auto" }}>
        {shown.length === 0 ? (
          <div className="mut">{q ? "No emails match your search." : "No emails on this day."}</div>
        ) : (
          <table>
            <thead><tr><th>When</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id}>
                  <td className="mut">{fmt(e.send_at)}</td>
                  <td><b>{e.professor_name || e.email}</b><div className="mut tiny">{e.email}</div></td>
                  <td>{e.subject}{e.error && <div className="tiny" style={{ color: "var(--bad)" }}>{e.error}</div>}</td>
                  <td><span className={`pill ${e.status}`}>{e.status}</span></td>
                  <td><RowMenu items={emailMenuItems(e)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12, flexShrink: 0 }}>
        <button className="btn sm sec" onClick={onClose}>Close</button>
      </div>
    </ModalShell>
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

// Fields for the single dropdown. Each maps to a DISTINCT OpenAlex subfield (the
// broad bucket) so you can add several and each is a separate filter. Labels in
// parentheses note what a broad bucket covers (e.g. AI includes ML & NLP).
const FIELD_OPTIONS: Array<{ label: string; term: string }> = [
  { label: "Artificial Intelligence (incl. ML & NLP)", term: "Artificial Intelligence" },
  { label: "Computer Vision & Pattern Recognition", term: "Computer Vision and Pattern Recognition" },
  { label: "Computer Networks & Cybersecurity", term: "Computer Networks and Communications" },
  { label: "Human–Computer Interaction", term: "Human-Computer Interaction" },
  { label: "Information Systems", term: "Information Systems" },
  { label: "Software Engineering", term: "Software" },
  { label: "Signal Processing", term: "Signal Processing" },
  { label: "Robotics & Control Systems", term: "Control and Systems Engineering" },
  { label: "Electrical & Electronic Engineering", term: "Electrical and Electronic Engineering" },
  { label: "Bioinformatics & Molecular Biology", term: "Molecular Biology" },
  { label: "Genetics", term: "Genetics" },
  { label: "Neuroscience", term: "Neuroscience" },
  { label: "Pharmacology", term: "Pharmacology" },
  { label: "Public Health", term: "Public Health" },
  { label: "Renewable Energy & Sustainability", term: "Renewable Energy" },
  { label: "Materials Science", term: "Materials Science" },
  { label: "Chemistry", term: "Chemistry" },
  { label: "Biotechnology", term: "Biotechnology" },
  { label: "Economics & Econometrics", term: "Economics" },
  { label: "Psychology", term: "Psychology" },
];

/** Details modal: professor info, profile links, and a few recent papers. */
function ProfessorDetailModal({ prof, email, onClose }: { prof: any; email?: string | null; onClose: () => void }) {
  const [works, setWorks] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    api(`/api/professors/works?id=${encodeURIComponent(prof.openalex_id)}`)
      .then((j) => { if (alive) setWorks(j.works || []); })
      .catch((e) => { if (alive) { setErr(e?.message || "Could not load papers"); setWorks([]); } });
    return () => { alive = false; };
  }, [prof.openalex_id]);
  const scholar = `https://scholar.google.com/scholar?q=${encodeURIComponent(`${prof.name} ${prof.institution || ""}`.trim())}`;
  const orcid = prof.orcid ? `https://orcid.org/${prof.orcid}` : null;
  const linkBtn = (href: string, label: string) => (
    <a className="btn sm sec" href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{label} ↗</a>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "auto", padding: 20 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <b style={{ fontSize: 17 }}>{prof.name}</b>
            <div className="mut tiny" style={{ marginTop: 2 }}>{prof.institution || "—"}{prof.country ? ` · ${String(prof.country).toUpperCase()}` : ""}</div>
          </div>
          <button className="btn sm sec" onClick={onClose}>Close</button>
        </div>

        <div className="row" style={{ gap: 16, marginTop: 12 }}>
          <div><div className="mut tiny">Works</div><b>{prof.source === "cache" ? "—" : Number(prof.works_count || 0).toLocaleString()}</b></div>
          <div><div className="mut tiny">Citations</div><b>{prof.source === "cache" ? "—" : Number(prof.cited_by_count || 0).toLocaleString()}</b></div>
          {email ? <div><div className="mut tiny">Email</div><a href={`mailto:${email}`} className="tiny" style={{ color: "var(--acc2)", wordBreak: "break-all" }}>{email}</a></div> : null}
        </div>

        {prof.topics ? <div style={{ marginTop: 12 }}><div className="mut tiny" style={{ marginBottom: 4 }}>Fields</div><div className="tiny">{prof.topics}</div></div> : null}

        <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {linkBtn(scholar, "Google Scholar")}
          {orcid && linkBtn(orcid, "ORCID")}
        </div>

        <div style={{ marginTop: 18 }}>
          <b style={{ fontSize: 14 }}>Recent papers</b>
          {works === null ? <div style={{ padding: "10px 0" }}><Loader label="Loading papers" /></div>
            : works.length === 0 ? <div className="mut tiny" style={{ marginTop: 8 }}>{err || "No papers found."}</div>
            : <div style={{ marginTop: 8 }}>
                {works.map((w, i) => (
                  <div key={i} className="emailrow" style={{ marginBottom: 8 }}>
                    {w.url ? <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{w.title}</a>
                           : <b style={{ fontSize: 13 }}>{w.title}</b>}
                    <div className="mut tiny" style={{ marginTop: 3 }}>
                      {[w.year, w.venue].filter(Boolean).join(" · ")}{w.cited_by_count ? ` · ${w.cited_by_count} citations` : ""}{w.is_oa ? " · Open access" : ""}
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </div>
  );
}

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
  const [concepts, setConcepts] = useState<Array<{ id: string; label: string; kind?: "topic" | "subfield"; match?: string }>>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<Record<string, any>>({});
  const [emails, setEmails] = useState<Record<string, { loading?: boolean; email?: string | null }>>({});
  const [detail, setDetail] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [needsEmail, setNeedsEmail] = useState<any[]>([]);
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [addBucket, setAddBucket] = useState("");
  const [newName, setNewName] = useState("");
  const bucketFields = () => {
    if (addBucket === NEW_BUCKET) return newName.trim() ? { bucket_name: newName.trim() } : {};
    return addBucket ? { bucket_id: addBucket } : {};
  };

  useEffect(() => { api("/api/buckets").then(setBuckets).catch(() => {}); }, []);

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

  const search = async (p = 1, conceptOverride?: Array<{ id: string; label: string; kind?: "topic" | "subfield"; match?: string }>) => {
    const cs = conceptOverride ?? concepts;
    if (!country && !inst.id && !cs.length && !query.trim()) { setStatus("Pick at least one filter"); return; }
    setBusy(true); setStatus("Searching…"); setPage(p);
    try {
      const j = await api("/api/professors/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        country, institutionId: inst.id, institutionLabel: inst.label,
        conceptIds: cs.filter((c) => c.kind !== "subfield").map((c) => c.id),
        subfieldIds: cs.filter((c) => c.kind === "subfield").map((c) => c.id),
        conceptLabels: cs.map((c) => c.match || c.label), // match mined "field" on the real subfield name
        query, page: p,
      }) });
      const rows = j.results || [];
      setResults(rows); setTotal(j.total || 0);
      // Pre-fill emails we already have cached so they show inline right away.
      const seeded: Record<string, { loading?: boolean; email?: string | null }> = {};
      let withEmail = 0;
      for (const r of rows) if (r.email) { seeded[r.openalex_id] = { loading: false, email: r.email }; withEmail++; }
      setEmails(seeded);
      setStatus(`${j.total} researcher(s) found${withEmail ? ` · ${withEmail} with email on this page` : ""}`);
    } catch (e: any) { setStatus("Error: " + e.message); }
    setBusy(false);
  };
  const toggle = (r: any) => setSel((s) => { const n = { ...s }; if (n[r.openalex_id]) delete n[r.openalex_id]; else n[r.openalex_id] = r; return n; });
  // Resolve a chosen field to its OpenAlex SUBFIELD (wide bucket) so the search
  // returns the whole area (e.g. all AI/ML), add it as a chip, and search.
  const addPreset = async (opt: { label: string; term: string }) => {
    if (!opt?.term) return;
    setBusy(true); setStatus(`Adding “${opt.label}”…`);
    try {
      const j = await api(`/api/openalex/broad-field?q=${encodeURIComponent(opt.term)}`);
      const sf = j.result;
      if (!sf?.id) { setBusy(false); setStatus(`No match for "${opt.label}"`); return; }
      if (concepts.some((c) => c.id === sf.id)) { setBusy(false); search(1); return; }
      const next = [...concepts, { id: sf.id, label: opt.label, kind: "subfield" as const, match: sf.label }];
      setConcepts(next);
      search(1, next); // show broad results immediately
    } catch { setBusy(false); toast("Could not add field"); }
  };
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
      const j = await api("/api/professors/add-from-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ professors: Object.values(sel), ...bucketFields() }) });
      toast(`Added ${j.added}${j.duplicates ? `, ${j.duplicates} dup` : ""}`);
      setNeedsEmail(j.needsEmail || []); setSel({}); setNewName("");
      api("/api/buckets").then(setBuckets).catch(() => {}); // refresh counts / new bucket
      setStatus(`Added ${j.added}. ${(j.needsEmail || []).length} need an email.`);
    } catch (e: any) { setStatus("Error: " + e.message); }
    setAdding(false);
  };
  const addManual = async (p: any, email: string) => {
    if (!email.includes("@")) { toast("Valid email required"); return; }
    await api("/api/professors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: p.name, email, university: p.institution || "", topics: p.topics || "", ...bucketFields() }) });
    toast("Added"); setNeedsEmail((list) => list.filter((x) => x !== p));
    api("/api/buckets").then(setBuckets).catch(() => {});
  };

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <p className="lead" style={{ margin: 0 }}>Search researchers by country, university and field, then add them to your list. Emails are pulled from their published papers where available.</p>
        <RefreshButton onClick={async () => { api("/api/buckets").then(setBuckets).catch(() => {}); toast("Refreshed"); }} />
      </div>
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
            <select value="" onChange={(e) => { const opt = FIELD_OPTIONS.find((o) => o.label === e.target.value); e.target.value = ""; if (opt) addPreset(opt); }}>
              <option value="">Select a field of research…</option>
              {FIELD_OPTIONS.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
            </select>
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
          <span className="mut tiny">Bucket:</span>
          <select value={addBucket} onChange={(e) => setAddBucket(e.target.value)} style={{ maxWidth: 220, height: 34, padding: "6px 10px" }}>
            <option value="">No bucket</option>
            {buckets.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.count})</option>)}
            <option value={NEW_BUCKET}>＋ New bucket…</option>
          </select>
          {addBucket === NEW_BUCKET && <input placeholder="New bucket name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ maxWidth: 180, height: 34, padding: "6px 10px" }} />}
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

      <div className="card">{busy ? <Loader /> : results.length ? (() => {
        const shown = onlyEmail ? results.filter((r) => emails[r.openalex_id]?.email) : results;
        return (
          <>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <span className="mut tiny">{shown.length} shown{onlyEmail ? " · with email" : ""}</span>
              <label className="chk" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={onlyEmail} onChange={(e) => setOnlyEmail(e.target.checked)} /> Only professors with an email
              </label>
            </div>
            {shown.length ? (
              <div className="table-wrap"><table><thead><tr><th style={{ width: 28 }}><input type="checkbox" aria-label="Select all" checked={shown.length > 0 && shown.every((r) => sel[r.openalex_id])} onChange={() => setSel((s) => { const all = shown.every((r) => s[r.openalex_id]); const n = { ...s }; if (all) { for (const r of shown) delete n[r.openalex_id]; } else { for (const r of shown) n[r.openalex_id] = r; } return n; })} /></th><th style={{ width: 44 }}>#</th><th>Name</th><th>Institution</th><th>Country</th><th>Topics</th><th>Works</th><th>Cited</th><th>Email</th></tr></thead><tbody>
                {shown.map((r, i) => (
                  <tr key={r.openalex_id} onClick={() => setDetail(r)} title="Click for details & papers" style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--field)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={!!sel[r.openalex_id]} onChange={() => toggle(r)} /></td>
                    <td className="mut">{(page - 1) * 25 + i + 1}</td>
                    <td>
                      <b>{r.name}</b>
                      {r.source === "cache" ? <span className="pill sent" style={{ marginLeft: 6, fontSize: 10 }}>mined</span> : null}
                      {r.orcid ? <div className="mut tiny">ORCID {r.orcid}</div> : null}
                    </td>
                    <td>{r.institution || "—"}</td>
                    <td className="mut">{(r.country || "").toUpperCase()}</td>
                    <td className="mut" style={{ maxWidth: 240 }}>{r.topics}</td>
                    <td>{r.source === "cache" ? "—" : r.works_count}</td>
                    <td>{r.source === "cache" ? "—" : r.cited_by_count}</td>
                    <td onClick={(e) => e.stopPropagation()}>{(() => {
                      const em = emails[r.openalex_id];
                      if (!em) return <button className="btn sm sec" onClick={() => findEmail(r)}>Find</button>;
                      if (em.loading) return <span className="mut tiny">Searching…</span>;
                      return em.email ? <a href={`mailto:${em.email}`} className="tiny" style={{ color: "var(--acc2)", wordBreak: "break-all" }}>{em.email}</a> : <span className="mut tiny">Not found</span>;
                    })()}</td>
                  </tr>
                ))}
              </tbody></table></div>
            ) : <div className="mut">No professors with an email on this page yet. Click Find on a row, or turn off the filter.</div>}
          </>
        );
      })() : <div className="mut">No results yet — set filters and search.</div>}</div>

      {results.length > 0 && (
        <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
          <button className="btn sm sec" disabled={page <= 1 || busy} onClick={() => search(page - 1)}>&larr; Prev</button>
          <span className="mut">Page {page}{total ? ` · ${total} total` : ""}</span>
          <button className="btn sm sec" disabled={results.length < 25 || busy} onClick={() => search(page + 1)}>Next &rarr;</button>
        </div>
      )}

      {detail && <ProfessorDetailModal prof={detail} email={emails[detail.openalex_id]?.email || detail.email} onClose={() => setDetail(null)} />}
    </>
  );
}

/* ---------- Email harvesting ---------- */
const CC_NAMES: Record<string, string> = { cn: "China", jp: "Japan", kr: "South Korea", tw: "Taiwan", sg: "Singapore" };

const cname = (code: string) => {
  if (CC_NAMES && CC_NAMES[code]) return CC_NAMES[code];
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of((code || "").toUpperCase()) || (code || "").toUpperCase(); }
  catch { return (code || "").toUpperCase(); }
};

function EmailHarvest({ toast }: any) {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [menuC, setMenuC] = useState<string | null>(null);
  const load = () => api("/api/admin/harvest/stats").then(setD).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!d?.active) return;
    const t = setInterval(load, 30000); // poll less often — stats scans a large table
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
  const pauseResume = async (c: string, paused: boolean) => {
    await api("/api/admin/harvest/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paused ? { resume: c } : { pause: c }) });
    load();
  };
  if (!d) return <Loader page />;
  if (openCountry) return <CountryDetail code={openCountry} name={cname(openCountry)} onBack={() => setOpenCountry(null)} toast={toast} />;

  const s = search.trim().toLowerCase();
  const cards = (d.countries || []).filter((c: any) => !s || c.country.toLowerCase().includes(s) || cname(c.country).toLowerCase().includes(s));

  return (
    <>
      <p className="lead">Mines professor emails from open-access papers, country by country. Click a country to view its professors.</p>
      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Toggle checked={!!d.active} onChange={toggle} label={d.active ? "Background crawl on" : "Background crawl off"} />
        <button className="btn sm sec" disabled={busy} onClick={runOne}>{busy ? "Running…" : "Run one batch now"}</button>
        <RefreshButton onClick={async () => { await load(); toast("Refreshed"); }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search country…" style={{ marginLeft: "auto", maxWidth: 240, height: 38, padding: "8px 12px" }} />
      </div>

      <div className="mine-grid">
        {cards.map((c: any) => (
          <div className="mine-card" key={c.country} onClick={() => setOpenCountry(c.country)}>
            <div className="mc-name">{cname(c.country)}</div>
            {c.priority && (
              <div className="mine-kebab" onClick={(e) => e.stopPropagation()}>
                <button className="kebab" onClick={() => setMenuC(menuC === c.country ? null : c.country)}>⋮</button>
                {menuC === c.country && (
                  <>
                    <div onClick={() => setMenuC(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                    <div className="menu">
                      <button onClick={() => { setMenuC(null); reset(c.country); }}>↻ Re-crawl</button>
                      {c.status !== "done" && (
                        <button onClick={() => { setMenuC(null); pauseResume(c.country, c.status === "paused"); }}>
                          {c.status === "paused" ? "▶ Resume" : "⏸ Pause"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="mc-foot">
              <div className="mc-stats">
                <div className="mc-emails"><b>{Number(c.cached || 0).toLocaleString()}</b><span>emails</span></div>
                {c.priority && <div className="mc-emails"><b>{Number(c.papers || 0).toLocaleString()}</b><span>papers</span></div>}
              </div>
              <span className={`pill ${c.status === "done" ? "sent" : c.status === "running" ? "scheduled" : c.status === "paused" ? "danger" : "draft"}`}>{c.priority ? c.status : "found"}</span>
            </div>
          </div>
        ))}
        {cards.length === 0 && <div className="mut">No countries match &ldquo;{search}&rdquo;.</div>}
      </div>
    </>
  );
}

/* ---------- Email cache: one country's professors ---------- */
// Add mined professors (email already known) into the user's list + optional bucket.
function AddMinedToBucketModal({ buckets, rows, onClose, onDone, toast }: any) {
  const [bucket, setBucket] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setBusy(true); setError("");
    const bf: any = bucketPayload(bucket, newName);
    try {
      const j = await api("/api/professors/add-mined", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows, ...bf }) });
      toast(`Added ${j.added} professor(s)${bf.bucket_id || bf.bucket_name ? " to bucket" : ""}`);
      onDone();
    } catch (e) { setError((e as Error)?.message || "Failed"); setBusy(false); }
  };
  return (
    <ModalShell onClose={onClose} maxWidth={420} title={`Add ${rows.length} to my professors`}>
      <div className="mut tiny" style={{ margin: "6px 0 10px" }}>Saved to your Professors list. Optionally file them into a bucket.</div>
      <BucketSelect value={bucket} onChange={setBucket} buckets={buckets} newName={newName} setNewName={setNewName} />
      {error && <div className="tiny" style={{ color: "var(--bad)", marginTop: 10 }}>{error}</div>}
      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn sm" onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add"}</button>
      </div>
    </ModalShell>
  );
}

function CountryDetail({ code, name, onBack, toast }: any) {
  const [nameQ, setNameQ] = useState("");
  const [uniQ, setUniQ] = useState("");
  const [fieldQ, setFieldQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [sel, setSel] = useState<Record<string, any>>({}); // keyed by openalex_id, persists across pages
  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => { api("/api/buckets").then(setBuckets).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      const p = new URLSearchParams({ code, page: String(page), pageSize: String(pageSize) });
      if (nameQ) p.set("name", nameQ);
      if (uniQ) p.set("university", uniQ);
      if (fieldQ) p.set("field", fieldQ);
      api(`/api/admin/harvest/country?${p.toString()}`)
        .then((x) => { setD(x); setLoading(false); })
        .catch(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [code, nameQ, uniQ, fieldQ, page, pageSize, reloadKey]);
  const pageCount = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const rows: any[] = d?.rows || [];
  const toggle = (r: any) => setSel((s) => { const n = { ...s }; if (n[r.openalex_id]) delete n[r.openalex_id]; else n[r.openalex_id] = r; return n; });
  const allChecked = rows.length > 0 && rows.every((r) => sel[r.openalex_id]);
  const toggleAll = () => setSel((s) => { const all = rows.every((r) => s[r.openalex_id]); const n = { ...s }; if (all) { for (const r of rows) delete n[r.openalex_id]; } else { for (const r of rows) n[r.openalex_id] = r; } return n; });
  const selCount = Object.keys(sel).length;
  const onFilter = (setter: (v: string) => void) => (e: any) => { setter(e.target.value); setPage(1); };
  const onEdited = (updated: any) => {
    setEditRow(null);
    setSel((s) => {
      if (!s[updated.openalex_id]) return s;
      return { ...s, [updated.openalex_id]: { ...s[updated.openalex_id], ...updated } };
    });
    setReloadKey((k) => k + 1);
  };
  return (
    <>
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <button className="btn sm sec" onClick={onBack}>← Back</button>
        <h1 style={{ margin: 0 }}>{name}</h1>
      </div>
      <p className="lead">Professors with a found email{d ? ` · ${Number(d.total).toLocaleString()}` : ""}.</p>
      <div className="card">
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <input value={nameQ} onChange={onFilter(setNameQ)} placeholder="Name or email…" style={{ maxWidth: 200, height: 38, padding: "8px 12px" }} aria-label="Search by name or email" />
          <input value={uniQ} onChange={onFilter(setUniQ)} placeholder="University…" style={{ maxWidth: 200, height: 38, padding: "8px 12px" }} />
          <input value={fieldQ} onChange={onFilter(setFieldQ)} placeholder="Topic / field…" style={{ maxWidth: 200, height: 38, padding: "8px 12px" }} />
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="pagesize" aria-label="Results per page" style={{ marginLeft: "auto" }}>
            {[20, 50, 100, 200, 500, 1000].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {selCount > 0 && (
          <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <b>{selCount} selected</b>
            <button className="btn sm" onClick={() => setShowAdd(true)}>Add to my professors / bucket</button>
            <button className="btn sm sec" onClick={() => setSel({})}>Clear</button>
          </div>
        )}

        {loading ? <Loader /> : (rows.length ? (
          <div className="table-wrap"><table><thead><tr>
            <th style={{ width: 28 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th>
            <th style={{ width: 44 }}>#</th><th>Name</th><th>Email</th><th>University</th><th>Field</th><th style={{ width: 44 }} />
          </tr></thead><tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r.openalex_id}>
                <td><input type="checkbox" checked={!!sel[r.openalex_id]} onChange={() => toggle(r)} aria-label={`Select ${r.name}`} /></td>
                <td className="mut">{(d.page - 1) * d.pageSize + i + 1}</td>
                <td><b>{r.name || "—"}</b></td>
                <td><a href={`mailto:${r.email}`} className="tiny" style={{ color: "var(--acc2)", wordBreak: "break-all" }}>{r.email}</a></td>
                <td className="mut">{r.institution || "—"}</td>
                <td className="mut">{r.field || "—"}</td>
                <td>
                  <RowMenu items={[
                    { label: "Edit email", onClick: () => setEditRow({ ...r, editFocus: "email" }) },
                    { label: "Edit institution", onClick: () => setEditRow({ ...r, editFocus: "institution" }) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody></table></div>
        ) : <div className="mut">No professors with an email{(nameQ || uniQ || fieldQ) ? " match your filters" : " yet"}.</div>)}
        {pageCount > 1 && (
          <div className="row" style={{ justifyContent: "center", marginTop: 14, gap: 10 }}>
            <button className="btn sm sec" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>&larr; Prev</button>
            <span className="mut">Page {page} of {pageCount}</span>
            <button className="btn sm sec" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next &rarr;</button>
          </div>
        )}
      </div>

      {showAdd && <AddMinedToBucketModal buckets={buckets} rows={Object.values(sel)} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); setSel({}); }} toast={toast} />}
      {editRow && <EditMinedProfessorModal row={editRow} onClose={() => setEditRow(null)} onSaved={onEdited} toast={toast} />}
    </>
  );
}

function EditMinedProfessorModal({ row, onClose, onSaved, toast }: any) {
  const [email, setEmail] = useState(row.email || "");
  const [institution, setInstitution] = useState(row.institution || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const instRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = row.editFocus === "institution" ? instRef.current : emailRef.current;
    el?.focus();
    el?.select();
  }, [row.editFocus]);
  const submit = async () => {
    if (!email.includes("@")) { setError("A valid email is required."); return; }
    setBusy(true); setError("");
    try {
      const updated = await api("/api/admin/harvest/country", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openalex_id: row.openalex_id, email: email.trim(), institution: institution.trim() }),
      });
      toast("Professor updated");
      onSaved(updated);
    } catch (e) {
      setError((e as Error)?.message || "Save failed");
      setBusy(false);
    }
  };
  return (
    <ModalShell onClose={onClose} maxWidth={420} title={`Edit · ${row.name || "Professor"}`}>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <div>
          <label>Email</label>
          <input ref={emailRef} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@university.edu" />
        </div>
        <div>
          <label>Institution / university</label>
          <input ref={instRef} value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="University name" />
        </div>
      </div>
      {error && <div className="tiny" style={{ color: "var(--bad)", marginTop: 10 }}>{error}</div>}
      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="btn sm sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn sm" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </ModalShell>
  );
}

/* ---------- Settings ---------- */
function Settings({ toast }: any) {
  const [d, setD] = useState<any>(null);
  const [quota, setQuota] = useState(20);
  const [name, setName] = useState("");
  const [aiBackground, setAiBackground] = useState("");
  const [university, setUniversity] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [workBlurb, setWorkBlurb] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [targetIntake, setTargetIntake] = useState("");
  const [saving, setSaving] = useState(false);
  const isAdmin = d?.role === "admin";

  const load = () =>
    api("/api/dashboard").then((x) => {
      setD(x);
      setQuota(x.stats.daily_quota);
      setName(x.sender_name || "");
      setAiBackground(x.ai_background || "");
      setUniversity(x.university || "");
      setCgpa(x.cgpa || "");
      setWorkBlurb(x.work_blurb || "");
      setPhone(x.phone || "");
      setLinkedin(x.linkedin_url || "");
      setTargetIntake(x.target_intake || "");
    });
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        sender_name: name,
        ai_background: aiBackground,
        university,
        cgpa,
        work_blurb: workBlurb,
        phone,
        linkedin_url: linkedin,
        target_intake: targetIntake,
      };
      if (isAdmin) body.daily_quota = quota;
      await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast("Saved");
      load();
    } catch (e) {
      toast((e as Error)?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!d) return <Loader page />;
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <p className="lead" style={{ margin: 0 }}>Gmail connection, sender identity, and AI email context.</p>
        <RefreshButton onClick={async () => { await load(); toast("Refreshed"); }} />
      </div>
      <div className="card"><div className="row" style={{ justifyContent: "space-between" }}>
        <div><b>Gmail</b><div className="mut">{d.gmail.needs_reconnect ? "Connection expired — reconnect to resume sending" : d.gmail.connected ? `Connected as ${d.gmail.email || "—"}` : "Not connected — sends run in dry-run mode"}</div></div>
        <span className={`pill ${d.gmail.needs_reconnect ? "off" : d.gmail.connected ? "on" : "off"}`}>{d.gmail.needs_reconnect ? "EXPIRED" : d.gmail.connected ? "CONNECTED" : "DRY-RUN"}</span></div>
        {d.gmail.needs_reconnect
          ? <div className="row" style={{ marginTop: 10 }}><button className="btn sm" onClick={reconnectGoogle}>Reconnect Google</button></div>
          : !d.gmail.connected && <div className="mut tiny" style={{ marginTop: 10 }}>Gmail connects automatically when you sign in with Google (with send permission). If it shows dry-run, sign out and back in and grant Gmail access.</div>}
      </div>

      <div className="card">
        <b>Email / AI profile</b>
        <div className="mut tiny" style={{ margin: "6px 0 12px" }}>
          Used when composing AI emails: research background is woven into the personalized paragraph; the other fields fill template tokens like {"{{university}}"} and {"{{cgpa}}"}.
        </div>
        <label>Your name (fills {"{{your_name}}"})</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 420, width: "100%" }} />
        <label style={{ marginTop: 12 }}>University / affiliation (fills {"{{university}}"})</label>
        <input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="e.g. the National University of Modern Languages (NUML), Faisalabad, Pakistan" style={{ maxWidth: 560, width: "100%" }} />
        <div className="row" style={{ gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <div style={{ flex: "1 1 140px", maxWidth: 200 }}>
            <label>CGPA (fills {"{{cgpa}}"})</label>
            <input value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="3.48/4.0" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: "1 1 140px", maxWidth: 200 }}>
            <label>Target intake (fills {"{{target_intake}}"})</label>
            <input value={targetIntake} onChange={(e) => setTargetIntake(e.target.value)} placeholder="Fall 2027" style={{ width: "100%" }} />
          </div>
        </div>
        <label style={{ marginTop: 12 }}>AI research background</label>
        <div className="mut tiny" style={{ marginBottom: 6 }}>One or two sentences the AI weaves into every personalized paragraph (paper title, your role, venue).</div>
        <textarea value={aiBackground} onChange={(e) => setAiBackground(e.target.value)} rows={4} placeholder='As co-author of "NeuroClip: …" (submitted to FIT 2026), I worked on …' style={{ width: "100%", maxWidth: 640, resize: "vertical" }} />
        <label style={{ marginTop: 12 }}>Work / experience blurb (fills {"{{work_blurb}}"})</label>
        <textarea value={workBlurb} onChange={(e) => setWorkBlurb(e.target.value)} rows={2} placeholder="I have over two years of experience in software and AI development as a Full Stack Developer at Xylator AI." style={{ width: "100%", maxWidth: 640, resize: "vertical" }} />
        <div className="row" style={{ gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <div style={{ flex: "1 1 200px", maxWidth: 280 }}>
            <label>Phone (fills {"{{phone}}"})</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: "1 1 260px", maxWidth: 360 }}>
            <label>LinkedIn (fills {"{{linkedin}}"})</label>
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} style={{ width: "100%" }} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        </div>
      </div>

      <div className="card">
        <b>Daily sending limit</b>
        {isAdmin ? (
          <>
            <label style={{ marginTop: 10 }}>Daily sending quota</label>
            <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input type="number" min={1} value={quota} onChange={(e) => setQuota(parseInt(e.target.value) || 20)} style={{ maxWidth: 160 }} />
              <button className="btn sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save quota"}</button>
            </div>
          </>
        ) : (
          <div className="mut tiny" style={{ marginTop: 8 }}>
            Your account can send up to <b style={{ color: "var(--ink)" }}>{d.stats.daily_quota}</b> emails per day. Contact an admin to change this limit.
          </div>
        )}
        <div className="mut tiny" style={{ marginTop: 8 }}>Used today: {d.stats.sent_today} · remaining: {d.stats.remaining_quota}</div>
      </div>
      <EmailTester toast={toast} />
    </>
  );
}

/* ---------- Admin Users ---------- */
function AdminUsers({ toast }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () =>
    api("/api/admin/users")
      .then((j) => { setUsers(j.users || []); setLoading(false); })
      .catch((e) => { toast((e as Error).message || "Failed to load users"); setLoading(false); });

  useEffect(() => { load(); }, []);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setSavingId(id);
    try {
      await api("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      toast("Updated");
      await load();
    } catch (e) {
      toast((e as Error).message || "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <p className="lead" style={{ margin: 0 }}>All registered users — roles, Gmail status, and daily quotas.</p>
        <RefreshButton onClick={async () => { setLoading(true); await load(); toast("Refreshed"); }} />
      </div>
      <div className="card">
        {loading ? <Loader /> : users.length === 0 ? <div className="mut">No users found.</div> : (
          <div className="table-wrap"><table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Gmail</th>
                <th>Quota</th>
                <th>Professors</th>
                <th>Emails</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.sender_name || u.full_name || u.email || "—"}</b>
                    <div className="mut tiny">{u.email}</div>
                  </td>
                  <td>
                    <select value={u.role} disabled={savingId === u.id} onChange={(e) => patch(u.id, { role: e.target.value })} style={{ height: 32, padding: "4px 8px", maxWidth: 110 }}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`pill ${u.gmail_needs_reconnect ? "off" : u.gmail_connected ? "on" : "off"}`}>
                      {u.gmail_needs_reconnect ? "EXPIRED" : u.gmail_connected ? "ON" : "OFF"}
                    </span>
                    {u.gmail_email && <div className="mut tiny">{u.gmail_email}</div>}
                  </td>
                  <td>
                    <input type="number" min={1} defaultValue={u.daily_quota} key={`${u.id}-${u.daily_quota}`} disabled={savingId === u.id}
                      onBlur={(e) => { const n = parseInt(e.target.value, 10); if (Number.isFinite(n) && n >= 1 && n !== u.daily_quota) patch(u.id, { daily_quota: n }); }}
                      style={{ width: 72, height: 32, padding: "4px 8px" }} />
                  </td>
                  <td className="mut">{u.professors}</td>
                  <td className="mut">{u.emails}</td>
                  <td className="mut tiny">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
