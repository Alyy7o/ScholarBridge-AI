import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve a bucket id from an explicit id or a (new-or-existing) name. Returns
 *  null when neither is provided. Creates the bucket if only a name is given. */
export async function ensureBucketId(
  sb: SupabaseClient,
  userId: string,
  opts: { bucketId?: string | null; bucketName?: string | null },
): Promise<string | null> {
  const id = (opts.bucketId || "").trim();
  if (id) return id;
  const name = (opts.bucketName || "").trim();
  if (!name) return null;

  const { data: existing } = await sb
    .from("professor_buckets")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from("professor_buckets")
    .insert({ user_id: userId, name })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

/** Add professors to a bucket (idempotent). Silently ignores empty input. */
export async function addMembers(
  sb: SupabaseClient,
  userId: string,
  bucketId: string | null,
  professorIds: string[],
): Promise<void> {
  if (!bucketId || !professorIds.length) return;
  const rows = professorIds
    .filter(Boolean)
    .map((professor_id) => ({ bucket_id: bucketId, professor_id, user_id: userId }));
  if (!rows.length) return;
  await sb.from("professor_bucket_members").upsert(rows, { onConflict: "bucket_id,professor_id" });
}

/** Remove professors from a bucket. Silently ignores empty input. */
export async function removeMembers(
  sb: SupabaseClient,
  userId: string,
  bucketId: string | null,
  professorIds: string[],
): Promise<void> {
  if (!bucketId || !professorIds.length) return;
  const ids = professorIds.filter(Boolean);
  if (!ids.length) return;
  await sb
    .from("professor_bucket_members")
    .delete()
    .eq("bucket_id", bucketId)
    .eq("user_id", userId)
    .in("professor_id", ids);
}
