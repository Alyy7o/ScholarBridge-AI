import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { parseReadyEmails } from "@/lib/parse";

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return err("file required");
  let items;
  try {
    items = await parseReadyEmails(Buffer.from(await file.arrayBuffer()), file.name);
  } catch (e) {
    return err((e as Error).message);
  }
  if (!items.length) return err("No emails could be parsed from that file.");
  return json({ emails: items.map((it) => ({ ...it, professor_name: "", workflow: "ready_doc" })) });
}
