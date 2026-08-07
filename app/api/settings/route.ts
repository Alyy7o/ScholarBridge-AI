import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { isAdminRole } from "@/lib/roles";

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

  const { data: profile } = await sb
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();
  const admin = isAdminRole(profile?.role, profile?.email || user.email);

  // Only admins may change their own daily_quota via Settings (users are fixed at profile value).
  if (s.daily_quota !== undefined && admin) {
    patch.daily_quota = Math.max(1, parseInt(String(s.daily_quota), 10) || 20);
  }

  for (const key of TEXT_FIELDS) {
    if (s[key] !== undefined) patch[key] = String(s[key] ?? "").trim();
  }
  await sb.from("profiles").update(patch).eq("id", user.id);
  return json({ ok: true, ...patch });
}
