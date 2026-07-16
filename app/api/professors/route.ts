import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export async function GET() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { data } = await sb.from("professors").select("*").order("created_at", { ascending: false });
  return json(data || []);
}

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const p = await req.json();
  if (!p.email || !String(p.email).includes("@")) return err("valid email required");
  if (!p.id) {
    const { data: dup } = await sb.from("professors").select("*").ilike("email", p.email).maybeSingle();
    if (dup) return json({ duplicate: true, professor: dup });
  }
  const row = {
    id: p.id, user_id: user.id, name: p.name || "", email: p.email,
    university: p.university || "", topics: p.topics || "",
  };
  const { data, error } = await sb.from("professors").upsert(row).select().single();
  if (error) return err(error.message, 500);
  return json(data);
}
