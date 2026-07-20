import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** Rename a bucket. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  if (!name) return err("Bucket name required");
  const { data, error } = await sb
    .from("professor_buckets")
    .update({ name })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return err(error.message, 500);
  return json(data);
}

/** Delete a bucket (memberships cascade). Professors themselves are untouched. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { error } = await sb.from("professor_buckets").delete().eq("id", params.id);
  if (error) return err(error.message, 500);
  return json({ ok: true });
}
