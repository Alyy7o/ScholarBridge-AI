import { requireAdmin } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Crawl control + per-country progress for the admin panel. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const admin = supabaseAdmin();
  const [{ data: ctrl }, { data: states }, { count: total }, { count: high }, { data: counts }] = await Promise.all([
    admin.from("harvest_control").select("*").eq("id", 1).maybeSingle(),
    admin.from("harvest_state").select("*"),
    admin.from("professor_emails").select("*", { count: "exact", head: true }).not("email", "is", null),
    admin.from("professor_emails").select("*", { count: "exact", head: true }).eq("confidence", "high"),
    admin.rpc("email_country_counts"),
  ]);
  const order: string[] = ctrl?.order_list || ["cn", "jp", "kr", "tw", "sg"];
  const byC = new Map((states || []).map((s: any) => [s.country, s]));

  // Exact per-country counts from SQL (same source as the country detail page).
  const cachedByCountry = new Map<string, number>((counts || []).map((r: any) => [r.country, Number(r.count)]));

  const allCountries = Array.from(new Set([...order, ...cachedByCountry.keys()]));
  const countries = allCountries.map((c) => ({
    country: c,
    status: byC.get(c)?.status || (order.includes(c) ? "pending" : "found"),
    papers: byC.get(c)?.papers || 0,
    cached: cachedByCountry.get(c) || 0,
    updated_at: byC.get(c)?.updated_at || null,
    priority: order.includes(c),
  }));
  countries.sort((a, b) => (Number(b.priority) - Number(a.priority)) || (b.cached - a.cached));

  return json({
    active: !!ctrl?.active,
    order,
    total: total || 0,
    high: high || 0,
    countries,
  });
}
