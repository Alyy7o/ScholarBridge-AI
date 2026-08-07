import { requireAdmin } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Paginated list of professors with an email for one country. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").toLowerCase().trim();
  if (!/^[a-z]{2}$/.test(code)) return err("code must be a 2-letter ISO country code");
  const q = (url.searchParams.get("q") || "").trim();
  const name = (url.searchParams.get("name") || "").trim();
  const university = (url.searchParams.get("university") || "").trim();
  const field = (url.searchParams.get("field") || "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const ALLOWED_SIZES = [20, 50, 100, 200, 500, 1000];
  const reqSize = Number(url.searchParams.get("pageSize"));
  const pageSize = ALLOWED_SIZES.includes(reqSize) ? reqSize : 50;
  const from = (page - 1) * pageSize;

  const admin = supabaseAdmin();
  let query = admin
    .from("professor_emails")
    .select("openalex_id,name,email,institution,field,country,confidence,last_seen_year", { count: "exact" })
    .eq("country", code)
    .not("email", "is", null);
  if (name) query = query.ilike("name", `%${name}%`);
  if (university) query = query.ilike("institution", `%${university}%`);
  if (field) query = query.ilike("field", `%${field}%`);
  if (q) query = query.or(`name.ilike.%${q}%,institution.ilike.%${q}%,email.ilike.%${q}%,field.ilike.%${q}%`);

  const { data, count, error } = await query.order("name").range(from, from + pageSize - 1);
  if (error) return err(error.message, 500);

  return json({ rows: data || [], total: count || 0, page, pageSize });
}
