"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";
import Landing from "@/components/Landing";

function HomeInner() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const search = useSearchParams();

  useEffect(() => {
    if (search.get("signin") === "1") setShowLogin(true);
  }, [search]);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  if (authed) return <Dashboard />;
  return showLogin ? <Login /> : <Landing onGetStarted={() => setShowLogin(true)} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
