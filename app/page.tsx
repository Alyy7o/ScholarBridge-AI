import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase";
import Dashboard from "@/components/Dashboard";
import Login from "@/components/Login";
import Landing from "@/components/Landing";
import AuthRefresh from "@/components/AuthRefresh";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: `AI Professor Outreach — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `AI Professor Outreach — ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: { signin?: string };
}) {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <>
      <AuthRefresh />
      {user ? <Dashboard /> : searchParams.signin === "1" ? <Login /> : <Landing />}
    </>
  );
}
