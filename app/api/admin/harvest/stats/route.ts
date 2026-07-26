import { requireUser, supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Crawl control + per-country progress for the admin panel. */
export async function GET() {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const admin = supabaseAdmin();
  const [{ data: ctrl }, { data: states }, { count: total }, { count: high }] = await Promise.all([
    admin.from("harvest_control").select("*").eq("id", 1).maybeSingle(),
    admin.from("harvest_state").select("*"),
    // Only rows with an actual email count as "cached" (email-less professors are
    // still saved, but shouldn't inflate the emails number).
    admin.from("professor_emails").select("*", { count: "exact", head: true }).not("email", "is", null),
    admin.from("professor_emails").select("*", { count: "exact", head: true }).eq("confidence", "high"),
  ]);
  const order: string[] = ctrl?.order_list || ["cn", "jp", "kr", "tw", "sg"];
  const byC = new Map((states || []).map((s: any) => [s.country, s]));

  // Reliable counts for the priority countries (direct queries — work even
  // before the email_country_counts migration is applied).
  const perPriority: Record<string, number> = {};
  await Promise.all(order.map(async (c) => {
    const { count } = await admin.from("professor_emails").select("*", { count: "exact", head: true }).eq("country", c).not("email", "is", null);
    perPriority[c] = count || 0;
  }));

  // Counts for EVERY other country via the SQL grouping function (needs migration
  // 0006). If it's missing we just show the priority countries.
  const { data: counts } = await admin.rpc("email_country_counts");
  const cachedByCountry = new Map<string, number>((counts || []).map((r: any) => [r.country, Number(r.count)]));
  for (const c of order) cachedByCountry.set(c, perPriority[c]); // priority counts win

  // Show a card for each priority country (even at 0) plus every other country
  // that has found emails. Priority ones keep their crawl status/papers.
  const allCountries = Array.from(new Set([...order, ...cachedByCountry.keys()]));
  const countries = allCountries.map((c) => ({
    country: c,
    status: byC.get(c)?.status || (order.includes(c) ? "pending" : "found"),
    papers: byC.get(c)?.papers || 0,
    cached: cachedByCountry.get(c) || 0,
    updated_at: byC.get(c)?.updated_at || null,
    priority: order.includes(c),
  }));
  // Priority countries first, then the rest by most emails.
  countries.sort((a, b) => (Number(b.priority) - Number(a.priority)) || (b.cached - a.cached));

  return json({
    active: !!ctrl?.active,
    order,
    total: total || 0,
    high: high || 0,
    countries,
  });
}
