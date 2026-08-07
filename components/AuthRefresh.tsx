"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

/** Refreshes the RSC tree when auth session changes (login / logout). */
export default function AuthRefresh() {
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();
    const { data: sub } = sb.auth.onAuthStateChange(() => {
      router.refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return null;
}
