import { requireAdmin, ADMIN_EMAIL, emailIsAdmin } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";

export const dynamic = "force-dynamic";

/** List all app users (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const admin = supabaseAdmin();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, full_name, sender_name, role, daily_quota, gmail_email, gmail_refresh_token, gmail_needs_reconnect, created_at")
    .order("created_at", { ascending: false });
  if (error) return err(error.message, 500);

  const rows = await Promise.all(
    (profiles || []).map(async (p) => {
      const [{ count: professors }, { count: emails }] = await Promise.all([
        admin.from("professors").select("*", { count: "exact", head: true }).eq("user_id", p.id),
        admin.from("scheduled_emails").select("*", { count: "exact", head: true }).eq("user_id", p.id),
      ]);
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        sender_name: p.sender_name,
        role: emailIsAdmin(p.email) ? "admin" : p.role || "user",
        daily_quota: p.daily_quota ?? 20,
        gmail_email: p.gmail_email,
        gmail_connected: !!p.gmail_refresh_token,
        gmail_needs_reconnect: !!p.gmail_needs_reconnect,
        created_at: p.created_at,
        professors: professors || 0,
        emails: emails || 0,
      };
    }),
  );

  return json({ users: rows });
}

/** Update a user's role and/or daily_quota (admin only). */
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "").trim();
  if (!id) return err("User id required");

  const admin = supabaseAdmin();
  const { data: target } = await admin.from("profiles").select("id, email, role").eq("id", id).maybeSingle();
  if (!target) return err("User not found", 404);

  const patch: Record<string, unknown> = {};

  if (b.role !== undefined) {
    const role = String(b.role).toLowerCase();
    if (role !== "admin" && role !== "user") return err("role must be admin or user");
    if (emailIsAdmin(target.email) && role !== "admin") {
      return err(`Cannot demote ${ADMIN_EMAIL}`);
    }
    patch.role = role;
  }

  if (b.daily_quota !== undefined) {
    const q = parseInt(String(b.daily_quota), 10);
    if (!Number.isFinite(q) || q < 1) return err("daily_quota must be a positive integer");
    patch.daily_quota = q;
  }

  if (!Object.keys(patch).length) return err("Nothing to update");

  const { data, error } = await admin.from("profiles").update(patch).eq("id", id).select("id, email, role, daily_quota").single();
  if (error) return err(error.message, 500);
  return json({ ok: true, user: data });
}
