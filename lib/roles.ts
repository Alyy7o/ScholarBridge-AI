import { requireUser } from "@/lib/supabase";
import { err } from "@/lib/http";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "alijaved.developer@gmail.com";

export function emailIsAdmin(email?: string | null): boolean {
  return (email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

export function isAdminRole(role?: string | null, email?: string | null): boolean {
  if (emailIsAdmin(email)) return true;
  return (role || "").toLowerCase() === "admin";
}

/** Require a signed-in admin. Returns 401/403 Response on failure. */
export async function requireAdmin(): Promise<
  | { sb: SupabaseClient; user: User; role: string }
  | { response: Response }
> {
  const { sb, user } = await requireUser();
  if (!user) return { response: err("Unauthorized", 401) };

  const { data: profile } = await sb
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role || "user";
  const email = profile?.email || user.email || "";
  if (!isAdminRole(role, email)) return { response: err("Forbidden", 403) };

  // Keep DB in sync if hardcoded admin email has no admin role yet.
  if (emailIsAdmin(email) && role !== "admin") {
    await sb.from("profiles").update({ role: "admin" }).eq("id", user.id);
  }

  return { sb, user, role: "admin" };
}

/** True when request carries a valid HARVEST_SECRET (cron / scripts). */
export function harvestSecretOk(req: Request): boolean {
  const secret = process.env.HARVEST_SECRET || "";
  if (!secret) return false;
  return (req.headers.get("x-harvest-secret") || "") === secret;
}
