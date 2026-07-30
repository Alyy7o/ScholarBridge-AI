import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { ensureBucketId, addMembers } from "@/lib/buckets";

/**
 * Add professors from the mined email cache straight into the user's saved
 * professors (and optionally a bucket). Unlike add-from-search, the email is
 * already known here, so nothing is re-scraped.
 */
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  const rows: any[] = Array.isArray(b.rows) ? b.rows.slice(0, 500) : [];
  if (!rows.length) return err("No professors selected");

  const bucketId = await ensureBucketId(sb, user.id, { bucketId: b.bucket_id, bucketName: b.bucket_name });

  const seen = new Set<string>();
  const toInsert = rows
    .map((r) => ({
      user_id: user.id,
      name: r.name || "",
      email: String(r.email || "").trim().toLowerCase(),
      university: r.institution || "",
      topics: r.field || "",
    }))
    .filter((r) => {
      if (!r.email.includes("@") || seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });
  if (!toInsert.length) return err("No valid emails in the selection");

  // Upsert on (user_id, email) so re-adding an existing professor is a no-op
  // but still returns its id (so it can be filed into the bucket too).
  const { data, error } = await sb
    .from("professors")
    .upsert(toInsert, { onConflict: "user_id,email" })
    .select("id");
  if (error) return err(error.message, 500);

  const ids = (data || []).map((d: any) => d.id);
  if (bucketId && ids.length) await addMembers(sb, user.id, bucketId, ids);

  return json({ added: ids.length, bucket_id: bucketId });
}
