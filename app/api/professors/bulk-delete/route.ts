import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** Delete many professors at once (RLS still scopes to the signed-in user). */
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (!ids.length) return err("No ids provided");
  const { error } = await sb.from("professors").delete().in("id", ids);
  if (error) return err(error.message, 500);
  return json({ ok: true, deleted: ids.length });
}
