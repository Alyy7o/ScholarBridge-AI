import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { autocomplete } from "@/lib/discover";

/** Autocomplete institutions or research fields for the search filters. */
export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const q = url.searchParams.get("q") || "";
  if (type !== "institutions" && type !== "concepts") return err("Invalid type");
  try {
    return json({ results: await autocomplete(type, q) });
  } catch (e) {
    return err((e as Error).message || "Autocomplete failed", 502);
  }
}
