import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

// Called by the client right after Google sign-in, passing the provider
// refresh token + Gmail address so the cron can send on the user's behalf.
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { refresh_token, email } = await req.json();
  const patch: Record<string, unknown> = {};
  if (refresh_token) patch.gmail_refresh_token = refresh_token;
  if (email) patch.gmail_email = email;
  if (Object.keys(patch).length) await sb.from("profiles").update(patch).eq("id", user.id);
  return json({ ok: true, connected: !!refresh_token });
}
