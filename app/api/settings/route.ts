import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const s = await req.json();
  const patch: Record<string, unknown> = {};
  if (s.daily_quota !== undefined) patch.daily_quota = parseInt(s.daily_quota) || 500;
  if (s.sender_name !== undefined) patch.sender_name = String(s.sender_name);
  await sb.from("profiles").update(patch).eq("id", user.id);
  return json({ ok: true, ...patch });
}
