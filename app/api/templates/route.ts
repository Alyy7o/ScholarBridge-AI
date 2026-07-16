import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { DEFAULT_SUBJECT, DEFAULT_TEMPLATE } from "@/lib/template";

export async function GET() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  let { data } = await sb.from("email_templates").select("*").order("created_at", { ascending: false });
  if (!data || data.length === 0) {
    await sb.from("email_templates").insert({
      user_id: user.id, name: "Default outreach", subject: DEFAULT_SUBJECT,
      body: DEFAULT_TEMPLATE, is_default: true,
    });
    ({ data } = await sb.from("email_templates").select("*").order("created_at", { ascending: false }));
  }
  return json(data || []);
}

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const t = await req.json();
  if (!t.name) return err("name required");
  if (t.is_default) await sb.from("email_templates").update({ is_default: false }).eq("user_id", user.id);
  const row = {
    id: t.id, user_id: user.id, name: t.name, subject: t.subject || "",
    body: t.body || "", is_default: !!t.is_default,
  };
  const { data, error } = await sb.from("email_templates").upsert(row).select().single();
  if (error) return err(error.message, 500);
  return json(data);
}
