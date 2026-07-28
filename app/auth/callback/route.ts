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
      // Upsert (not update) so it self-heals if the signup trigger never
      // created the profile row — otherwise the token would silently not save.
      const patch: Record<string, unknown> = {
        id: s.user.id,
        email: s.user.email,
        gmail_email: s.user.email,
      };
      // A fresh refresh token means the connection is healthy again — clear the
      // "needs reconnect" flag so the warning banner disappears.
      if (s.provider_refresh_token) {
        patch.gmail_refresh_token = s.provider_refresh_token;
        patch.gmail_needs_reconnect = false;
      }
      await sb.from("profiles").upsert(patch, { onConflict: "id" });
    }
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
