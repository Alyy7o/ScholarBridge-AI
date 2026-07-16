import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { data } = await sb.from("attachments").select("storage_path").eq("id", params.id).maybeSingle();
  if (data?.storage_path) await sb.storage.from("attachments").remove([data.storage_path]);
  await sb.from("attachments").delete().eq("id", params.id);
  return json({ ok: true });
}
