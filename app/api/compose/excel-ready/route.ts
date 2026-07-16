import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { parseExcelReady } from "@/lib/parse";

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return err("file required");
  let items;
  try {
    items = parseExcelReady(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return err((e as Error).message);
  }
  if (!items.length) return err("No valid rows found.");
  return json({ emails: items.map((it) => ({ ...it, professor_name: "", workflow: "excel_ready" })) });
}
