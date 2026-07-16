import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export async function GET() {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const { data } = await sb
    .from("attachments")
    .select("id,kind,filename,mime,size,created_at")
    .order("created_at", { ascending: false });
  return json(data || []);
}

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const kind = String(form.get("kind") || "cv");
  if (!file) return err("file required");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const up = await sb.storage.from("attachments").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (up.error) return err(up.error.message, 500);
  const { data, error } = await sb.from("attachments").insert({
    user_id: user.id, kind, filename: file.name, mime: file.type,
    size: bytes.length, storage_path: path,
  }).select("id,kind,filename,mime,size").single();
  if (error) return err(error.message, 500);
  return json(data);
}
