// One-time migration: copy the professor_emails mined cache from Supabase (Postgres)
// into Turso (SQLite/libSQL). Only rows WITH an email are moved.
//
// Run with these env vars set (a .env is fine if you use `node --env-file=.env`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (read from Supabase)
//   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN       (write to Turso)
//
//   npm install @libsql/client
//   node --env-file=.env scripts/migrate-professors-to-turso.mjs
//   (or set the vars inline: TURSO_DATABASE_URL=… node scripts/migrate-professors-to-turso.mjs)

import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient as createTurso } from "@libsql/client";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!SUPABASE_URL || !SERVICE_KEY || !TURSO_URL) {
  console.error("Missing env. Need: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN");
  process.exit(1);
}

const sb = createSupabase(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const db = createTurso({ url: TURSO_URL, authToken: TURSO_TOKEN });

// 1) Schema (SQLite). source_work_ids is a Postgres text[] → stored here as JSON text.
await db.batch([
  `CREATE TABLE IF NOT EXISTS professor_emails (
     openalex_id      TEXT PRIMARY KEY,
     name             TEXT,
     email            TEXT,
     domain           TEXT,
     institution      TEXT,
     country          TEXT,
     source_work_ids  TEXT,
     times_seen       INTEGER DEFAULT 1,
     first_seen_year  INTEGER,
     last_seen_year   INTEGER,
     confidence       TEXT DEFAULT 'low',
     field            TEXT,
     created_at       TEXT DEFAULT (datetime('now')),
     updated_at       TEXT DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_pe_country ON professor_emails(country)`,
  `CREATE INDEX IF NOT EXISTS idx_pe_email   ON professor_emails(email)`,
], "write");

// 2) Copy rows in pages, upserting into Turso in batches.
const PAGE = 500;
let from = 0;
let total = 0;
for (;;) {
  const { data, error } = await sb
    .from("professor_emails")
    .select("*")
    .not("email", "is", null)
    .order("openalex_id")
    .range(from, from + PAGE - 1);
  if (error) { console.error("Supabase read failed:", error.message); process.exit(1); }
  if (!data || !data.length) break;

  const stmts = data.map((r) => ({
    sql: `INSERT INTO professor_emails
      (openalex_id,name,email,domain,institution,country,source_work_ids,times_seen,first_seen_year,last_seen_year,confidence,field,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(openalex_id) DO UPDATE SET
        name=excluded.name, email=excluded.email, domain=excluded.domain, institution=excluded.institution,
        country=excluded.country, source_work_ids=excluded.source_work_ids, times_seen=excluded.times_seen,
        first_seen_year=excluded.first_seen_year, last_seen_year=excluded.last_seen_year,
        confidence=excluded.confidence, field=excluded.field, updated_at=excluded.updated_at`,
    args: [
      r.openalex_id,
      r.name || "",
      r.email || null,
      r.domain || "",
      r.institution || "",
      (r.country || "").toLowerCase(),
      JSON.stringify(r.source_work_ids || []),
      r.times_seen || 1,
      r.first_seen_year ?? null,
      r.last_seen_year ?? null,
      r.confidence || "low",
      r.field || "",
      r.created_at || new Date().toISOString(),
      r.updated_at || new Date().toISOString(),
    ],
  }));
  await db.batch(stmts, "write");

  total += data.length;
  from += PAGE;
  console.log(`migrated ${total}…`);
  if (data.length < PAGE) break;
}

const { rows } = await db.execute("SELECT COUNT(*) AS n FROM professor_emails");
console.log(`✅ Done. Copied ${total} rows. Turso now has ${rows[0].n} professors.`);
process.exit(0);
