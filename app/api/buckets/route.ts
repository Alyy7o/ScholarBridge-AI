import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** List the user's buckets with a member count each. */
export async function GET() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { data: buckets } = await sb
    .from("professor_buckets")
    .select("*")
    .order("created_at", { ascending: true });
  const { data: members } = await sb.from("professor_bucket_members").select("bucket_id");
  const counts = new Map<string, number>();
  for (const m of members || []) counts.set(m.bucket_id, (counts.get(m.bucket_id) || 0) + 1);
  return json((buckets || []).map((b) => ({ ...b, count: counts.get(b.id) || 0 })));
}

/** Create a bucket. Returns the existing one if the name is already taken. */
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  if (!name) return err("Bucket name required");

  const { data: existing } = await sb
    .from("professor_buckets")
    .select("*")
    .eq("user_id", user.id)
    .ilike("name", name)
    .maybeSingle();
  if (existing) return json(existing);

  const { data, error } = await sb
    .from("professor_buckets")
    .insert({ user_id: user.id, name })
    .select()
    .single();
  if (error) return err(error.message, 500);
  return json(data);
}
