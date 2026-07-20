import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { ensureBucketId, addMembers } from "@/lib/buckets";

/** Add already-saved professors to a bucket (existing id or new name). */
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.professor_ids) ? b.professor_ids.map(String).filter(Boolean) : [];
  if (!ids.length) return err("No professors selected");
  const bucketId = await ensureBucketId(sb, user.id, { bucketId: b.bucket_id, bucketName: b.bucket_name });
  if (!bucketId) return err("Bucket required");
  await addMembers(sb, user.id, bucketId, ids);
  return json({ ok: true, bucket_id: bucketId, added: ids.length });
}
