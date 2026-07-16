"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

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
          options: {
            data: { full_name: name },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg({ kind: "ok", text: "Check your inbox to confirm your email, then sign in." });
        }
        // if session exists, page.tsx onAuthStateChange flips to the app
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.message || "Something went wrong." });
    }
    setBusy(false);
  };

  return (
    <div className="login">
      <div className="box">
        <div className="logo">SB</div>
        <h1>ScholarBridge AI</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          Research professors, personalize outreach, and schedule it — all in one place.
        </p>

        <button className="gbtn" onClick={google} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          <span style={{ color: "#4285F4", fontWeight: 800 }}>G</span> Continue with Google
        </button>
        <p className="tiny mut" style={{ margin: "8px 0 0" }}>
          Google sign-in also lets ScholarBridge send your scheduled emails.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <span className="tiny mut">or</span>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        <div className="tabs" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
          <button className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setMsg(null); }}>Sign in</button>
          <button className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setMsg(null); }}>Sign up</button>
        </div>

        <form onSubmit={submit} style={{ textAlign: "left" }}>
          {mode === "signup" && (
            <div style={{ marginBottom: 10 }}>
              <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <input type="password" placeholder="Password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {msg && (
            <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 9, fontSize: 13,
              background: msg.kind === "ok" ? "#062e17" : "#3a1620", color: msg.kind === "ok" ? "#4ade80" : "#fecaca" }}>
              {msg.text}
            </div>
          )}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {mode === "signin" && (
          <p className="tiny mut" style={{ marginTop: 12 }}>
            Note: email/password accounts can draft and schedule, but sending real emails needs Google sign-in (for Gmail access).
          </p>
        )}
      </div>
    </div>
  );
}
