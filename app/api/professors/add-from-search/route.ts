import { requireUser, supabaseAdmin } from "@/lib/supabase";
import { json, err } from "@/lib/http";
import { harvestForAuthor } from "@/lib/harvest";
import { ensureBucketId, addMembers } from "@/lib/buckets";

export const maxDuration = 60;

type Incoming = {
  openalex_id?: string;
  name?: string;
  institution?: string;
  topics?: string;
};

/**
 * Add selected search results to the professors list. Emails aren't provided by
 * any research API, so we scrape a best-effort corresponding-author email from
 * each professor's open-access papers. Professors with no discoverable email are
 * returned to the client so the user can add them manually.
 */
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return err("Unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const profs: Incoming[] = Array.isArray(body.professors) ? body.professors.slice(0, 15) : [];
  if (!profs.length) return err("No professors selected");

  const bucketId = await ensureBucketId(sb, user.id, { bucketId: body.bucket_id, bucketName: body.bucket_name });
  let added = 0;
  let duplicates = 0;
  const needsEmail: Incoming[] = [];
  const memberIds: string[] = [];

  for (const p of profs) {
    const name = String(p.name || "").trim();
    if (!name) continue;
    let email: string | null = null;
    if (p.openalex_id) {
      try {
        const r = await harvestForAuthor(supabaseAdmin(), p.openalex_id, name);
        email = r.email;
      } catch {
        email = null;
      }
    }
    if (!email) {
      needsEmail.push({ name, institution: p.institution, topics: p.topics });
      continue;
    }
    const { data: dup } = await sb.from("professors").select("id").ilike("email", email).maybeSingle();
    if (dup) {
      duplicates++;
      memberIds.push(dup.id);
      continue;
    }
    const { data: ins, error } = await sb.from("professors").insert({
      user_id: user.id,
      name,
      email,
      university: p.institution || "",
      topics: p.topics || "",
    }).select("id").single();
    if (error) duplicates++;
    else { added++; if (ins) memberIds.push(ins.id); }
  }

  await addMembers(sb, user.id, bucketId, memberIds); // file everyone found into the bucket
  return json({ added, duplicates, needsEmail });
}
