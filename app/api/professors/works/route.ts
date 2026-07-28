import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { authorWorks } from "@/lib/discover";

export const maxDuration = 20;

/** Recent papers for a single professor (OpenAlex author id), for the details view. */
export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return err("id is required");
  try {
    const works = await authorWorks(id, 6);
    return json({ works });
  } catch (e) {
    return err((e as Error).message || "Could not load papers", 502);
  }
}
