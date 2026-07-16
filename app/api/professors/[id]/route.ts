import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  await sb.from("professors").delete().eq("id", params.id);
  return json({ ok: true });
}
