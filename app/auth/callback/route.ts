import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const sb = supabaseServer();
  if (code) {
    const { data } = await sb.auth.exchangeCodeForSession(code);
    const s = data.session;
    if (s?.user) {
      // Capture the Gmail refresh token so the cron can send later.
      const patch: Record<string, unknown> = { gmail_email: s.user.email };
      if (s.provider_refresh_token) patch.gmail_refresh_token = s.provider_refresh_token;
      await sb.from("profiles").update(patch).eq("id", s.user.id);
    }
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
