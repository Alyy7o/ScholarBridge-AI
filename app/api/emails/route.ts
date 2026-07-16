import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export async function GET(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const status = new URL(req.url).searchParams.get("status") || "all";
  let q = sb.from("scheduled_emails").select("*").order("send_at", { ascending: true, nullsFirst: false });
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return json(data || []);
}
