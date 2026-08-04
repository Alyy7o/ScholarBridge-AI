import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

const TEXT_FIELDS = [
  "sender_name",
  "ai_background",
  "university",
  "cgpa",
  "work_blurb",
  "phone",
  "linkedin_url",
  "target_intake",
] as const;

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const s = await req.json();
  const patch: Record<string, unknown> = {};
  if (s.daily_quota !== undefined) patch.daily_quota = parseInt(s.daily_quota) || 500;
  for (const key of TEXT_FIELDS) {
    if (s[key] !== undefined) patch[key] = String(s[key] ?? "").trim();
  }
  await sb.from("profiles").update(patch).eq("id", user.id);
  return json({ ok: true, ...patch });
}
