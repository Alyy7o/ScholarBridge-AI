import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { parseProfessors } from "@/lib/parse";
import { ensureBucketId, addMembers } from "@/lib/buckets";

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return err("file required");
  let rows;
  try {
    rows = parseProfessors(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return err(`Could not read file: ${(e as Error).message}`);
  }
  const bucketId = await ensureBucketId(sb, user.id, {
    bucketId: String(form.get("bucket_id") || ""),
    bucketName: String(form.get("bucket_name") || ""),
  });
  let added = 0, dupes = 0;
  const memberIds: string[] = [];
  for (const r of rows) {
    const { data: exists } = await sb.from("professors").select("id").ilike("email", r.email).maybeSingle();
    if (exists) { dupes++; memberIds.push(exists.id); continue; }
    const { data: ins } = await sb.from("professors").insert({ ...r, user_id: user.id }).select("id").single();
    if (ins) memberIds.push(ins.id);
    added++;
  }
  await addMembers(sb, user.id, bucketId, memberIds); // file all uploaded rows into the bucket
  return json({ added, duplicates: dupes, total_rows: rows.length });
}
