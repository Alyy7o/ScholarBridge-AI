import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { addMembers, removeMembers } from "@/lib/buckets";

/** List professors currently in this bucket. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);

  const { data: bucket } = await sb
    .from("professor_buckets")
    .select("id, name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bucket) return err("Bucket not found", 404);

  const { data: members, error } = await sb
    .from("professor_bucket_members")
    .select("professor_id")
    .eq("bucket_id", params.id)
    .eq("user_id", user.id);
  if (error) return err(error.message, 500);

  const ids = (members || []).map((m) => m.professor_id);
  if (!ids.length) return json({ bucket, members: [], professor_ids: [] });

  const { data: professors } = await sb
    .from("professors")
    .select("id, name, email, university")
    .in("id", ids)
    .eq("user_id", user.id);

  return json({
    bucket,
    members: professors || [],
    professor_ids: ids,
  });
}

/** Replace membership with the given professor_ids (add missing, remove extras). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);

  const { data: bucket } = await sb
    .from("professor_buckets")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bucket) return err("Bucket not found", 404);

  const body = (await req.json().catch(() => ({}))) as { professor_ids?: unknown };
  const rawIds: unknown[] = Array.isArray(body.professor_ids) ? body.professor_ids : [];
  const desired: string[] = [];
  const seen = new Set<string>();
  for (const id of rawIds) {
    const s = String(id || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    desired.push(s);
  }

  const { data: currentRows } = await sb
    .from("professor_bucket_members")
    .select("professor_id")
    .eq("bucket_id", params.id)
    .eq("user_id", user.id);
  const current = new Set<string>((currentRows || []).map((r) => String(r.professor_id)));
  const next = new Set(desired);

  const toAdd = desired.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));

  await addMembers(sb, user.id, params.id, toAdd);
  await removeMembers(sb, user.id, params.id, toRemove);

  return json({
    ok: true,
    bucket_id: params.id,
    count: desired.length,
    added: toAdd.length,
    removed: toRemove.length,
  });
}
