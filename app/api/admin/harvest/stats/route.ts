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
    admin.from("professor_emails").select("*", { count: "exact", head: true }),
    admin.from("professor_emails").select("*", { count: "exact", head: true }).eq("confidence", "high"),
  ]);
  const order: string[] = ctrl?.order_list || ["cn", "jp", "kr", "tw", "sg"];
  const byC = new Map((states || []).map((s: any) => [s.country, s]));
  // Per-country cached-email counts.
  const perCountry: Record<string, number> = {};
  for (const c of order) {
    const { count } = await admin.from("professor_emails").select("*", { count: "exact", head: true }).eq("country", c);
    perCountry[c] = count || 0;
  }
  return json({
    active: !!ctrl?.active,
    order,
    total: total || 0,
    high: high || 0,
    countries: order.map((c) => ({
      country: c,
      status: byC.get(c)?.status || "pending",
      papers: byC.get(c)?.papers || 0,
      cached: perCountry[c] || 0,
      updated_at: byC.get(c)?.updated_at || null,
    })),
  });
}
