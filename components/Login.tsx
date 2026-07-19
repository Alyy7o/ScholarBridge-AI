"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const CapLogo = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 8l11 5 9-4.09V15h2V8L12 3zM5 13.18v3.5C5 18.5 8.13 20 12 20s7-1.5 7-3.32v-3.5l-7 3.18-7-3.18z" /></svg>
);

const GoogleG = () => (
  <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.6 5.6C41.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  const google = async () => {
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "email profile https://www.googleapis.com/auth/gmail.send",
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!email || !password) { setMsg({ kind: "err", text: "Email and password are required." }); return; }
    if (mode === "signup" && password.length < 6) { setMsg({ kind: "err", text: "Password must be at least 6 characters." }); return; }
    setBusy(true);
    const sb = supabaseBrowser();
    try {
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (!data.session) setMsg({ kind: "ok", text: "Check your inbox to confirm your email, then sign in." });
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setMsg({ kind: "err", text: (err as Error)?.message || "Something went wrong." });
    }
    setBusy(false);
  };

  const iconStroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <div className="auth">
      <aside className="auth-hero">
        <div className="auth-badge"><span className="logo"><CapLogo /></span> ScholarBridge AI</div>
        <div>
          <h1>Reach the right professors, faster.</h1>
          <p className="htxt">Find professors by field and university, personalize every email with their recent research, and schedule your whole outreach campaign — in one place.</p>
        </div>
        <div className="auth-feats">
          <div className="auth-feat">
            <span className="auth-feat-ic"><svg width="18" height="18" viewBox="0 0 24 24" {...iconStroke}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg></span>
            <div><b>Find professors</b><span>Search by country, university and field of research.</span></div>
          </div>
          <div className="auth-feat">
            <span className="auth-feat-ic"><svg width="18" height="18" viewBox="0 0 24 24" {...iconStroke}><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" /></svg></span>
            <div><b>AI personalization</b><span>Every email tailored to a professor&apos;s own papers.</span></div>
          </div>
          <div className="auth-feat">
            <span className="auth-feat-ic"><svg width="18" height="18" viewBox="0 0 24 24" {...iconStroke}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg></span>
            <div><b>Schedule &amp; send</b><span>Queue campaigns and send automatically on your time.</span></div>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
          <p className="sub">{mode === "signin" ? "Sign in to continue to ScholarBridge." : "Start your outreach in a couple of minutes."}</p>

          <button type="button" className="auth-google" onClick={google} disabled={busy}><GoogleG /> Continue with Google</button>
          <p className="auth-hint">Google sign-in also lets ScholarBridge send your scheduled emails.</p>

          <div className="auth-div"><span /><small>or</small><span /></div>

          <div className="auth-seg">
            <button type="button" className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setMsg(null); }}>Sign in</button>
            <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setMsg(null); }}>Sign up</button>
          </div>

          <form onSubmit={submit}>
            {mode === "signup" && (
              <div className="auth-field">
                <span className="fi"><svg width="17" height="17" viewBox="0 0 24 24" {...iconStroke}><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></svg></span>
                <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="auth-field">
              <span className="fi"><svg width="17" height="17" viewBox="0 0 24 24" {...iconStroke}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>
              <input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="auth-field">
              <span className="fi"><svg width="17" height="17" viewBox="0 0 24 24" {...iconStroke}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
              <input type="password" placeholder="Password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {msg && <div className="auth-msg" style={{ color: msg.kind === "ok" ? "var(--acc)" : "var(--bad)" }}>{msg.text}</div>}
            <button className="btn auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
          </form>

          {mode === "signin" && <p className="auth-note">Email/password accounts can draft and schedule, but sending real emails needs Google sign-in for Gmail access.</p>}
        </div>
      </main>
    </div>
  );
}
