import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { listCountryInstitutions } from "@/lib/discover";

/** List a country's universities for the country -> university dropdown. */
export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const country = new URL(req.url).searchParams.get("country") || "";
  if (!country) return json({ results: [] });
  try {
    return json({ results: await listCountryInstitutions(country) });
  } catch (e) {
    return err((e as Error).message || "Could not load universities", 502);
  }
}
