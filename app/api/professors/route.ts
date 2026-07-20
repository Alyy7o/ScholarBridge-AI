import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { ensureBucketId, addMembers } from "@/lib/buckets";

export async function GET() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { data } = await sb.from("professors").select("*").order("created_at", { ascending: false });
  const { data: members } = await sb.from("professor_bucket_members").select("professor_id,bucket_id");
  const byProf = new Map<string, string[]>();
  for (const m of members || []) {
    const list = byProf.get(m.professor_id) || [];
    list.push(m.bucket_id);
    byProf.set(m.professor_id, list);
  }
  return json((data || []).map((p) => ({ ...p, bucket_ids: byProf.get(p.id) || [] })));
}

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const p = await req.json();
  if (!p.email || !String(p.email).includes("@")) return err("valid email required");
  if (!p.id) {
    const { data: dup } = await sb.from("professors").select("*").ilike("email", p.email).maybeSingle();
    if (dup) {
      // Already saved — still file them into the chosen bucket.
      const bId = await ensureBucketId(sb, user.id, { bucketId: p.bucket_id, bucketName: p.bucket_name });
      await addMembers(sb, user.id, bId, [dup.id]);
      return json({ duplicate: true, professor: dup, bucketed: !!bId });
    }
  }
  const row = {
    id: p.id, user_id: user.id, name: p.name || "", email: p.email,
    university: p.university || "", topics: p.topics || "",
  };
  const { data, error } = await sb.from("professors").upsert(row).select().single();
  if (error) return err(error.message, 500);
  // Optionally file the professor into a bucket (existing id or new name).
  const bucketId = await ensureBucketId(sb, user.id, { bucketId: p.bucket_id, bucketName: p.bucket_name });
  await addMembers(sb, user.id, bucketId, [data.id]);
  return json(data);
}
