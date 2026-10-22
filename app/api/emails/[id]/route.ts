import { requireUser } from "@/lib/supabase";
import { json, err } from "@/lib/http";

/** Statuses whose content can still be edited (already-sent mail is locked). */
const EDITABLE = new Set(["draft", "scheduled", "paused", "failed", "cancelled"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);

  const { data: row } = await sb
    .from("scheduled_emails")
    .select("id,status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return err("not found", 404);
  if (!EDITABLE.has(row.status)) {
    return err("Sent emails can't be edited. Duplicate or reschedule a new one instead.");
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, string | null | string[]> = {};

  if (typeof body.subject === "string") patch.subject = body.subject.trim();
  if (typeof body.body === "string") patch.body = body.body;
  if (typeof body.email === "string") {
    const em = body.email.trim();
    if (!em.includes("@")) return err("A valid recipient email is required");
    patch.email = em;
  }
  if (typeof body.professor_name === "string") patch.professor_name = body.professor_name.trim();

  if (Array.isArray(body.attachment_ids)) {
    const ids = body.attachment_ids
      .map((x: unknown) => String(x ?? "").trim())
      .filter(Boolean);
    // Only allow attachments owned by this user
    if (ids.length) {
      const { data: owned } = await sb.from("attachments").select("id").in("id", ids);
      const allowed = new Set((owned || []).map((a: { id: string }) => a.id));
      patch.attachment_ids = ids.filter((id) => allowed.has(id));
    } else {
      patch.attachment_ids = [];
    }
  }

  // Optional schedule change (calendar + time in the Update popup).
  if (typeof body.send_at === "string" && body.send_at.trim()) {
    const when = new Date(body.send_at);
    if (isNaN(when.getTime())) return err("A valid send_at time is required");
    if (when.getTime() < Date.now() - 60_000) return err("Pick a time in the future");
    patch.send_at = when.toISOString();
    // Re-queue cancelled / failed / draft when a new time is set
    if (["cancelled", "failed", "draft"].includes(row.status)) {
      patch.status = "scheduled";
      patch.error = null;
      patch.sent_at = null;
    }
  }

  if (!Object.keys(patch).length) return err("Nothing to update");

  const { data, error } = await sb
    .from("scheduled_emails")
    .update(patch)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) return err(error.message, 500);
  return json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  await sb.from("scheduled_emails").delete().eq("id", params.id).eq("user_id", user.id);
  return json({ ok: true });
}
