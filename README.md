# ScholarBridge AI — Next.js + Supabase

AI-personalized professor outreach: research → draft → attach → **schedule** → send. Full-stack **Next.js 14** (App Router, one Vercel deploy) with **Supabase** for Postgres, Auth (Google), and Storage. Scheduled emails fire via a **Supabase Edge Function on a cron**.

## Architecture
```
Next.js (Vercel)  ──►  API route handlers  ──►  Supabase (Postgres + Auth + Storage)
       UI                 lib/ services              │
                     Research graph / Semantic Scholar      │ cron (pg_cron every 5 min)
                     OpenRouter (DeepSeek/Qwen)        ▼
                     Gmail REST (send)          Edge Function `process-due` → Gmail
```

## Features
Dashboard · Compose (AI personalization / ready-doc import / excel-ready) · Professors (upload + dedup + manual) · Templates · Attachments (Supabase Storage) · Schedule & History (pause/resume/cancel/send-now) · Settings · Google sign-in with Gmail send · cron sending.

## Setup

### 1. Supabase project
1. Create a project at supabase.com.
2. **SQL Editor** → run `supabase/migrations/0001_init.sql` (tables, RLS, storage bucket, signup trigger).
3. **Authentication → Providers → Google**: enable it, paste your Google OAuth **Client ID + Secret** (from step 3), and add scope `https://www.googleapis.com/auth/gmail.send` under "Additional scopes". Set the callback to Supabase's shown URL.
4. **Database → Extensions**: enable `pg_cron` and `pg_net`.

### 2. Google Cloud OAuth
1. Create an OAuth 2.0 **Web** client. Enable the **Gmail API**.
2. Authorized redirect URIs: your Supabase auth callback (`https://<ref>.supabase.co/auth/v1/callback`) **and** `https://YOUR_APP/auth/callback`.
3. Keep the Client ID + Secret — used in Supabase (step 1.3) and in Vercel env (below).

### 3. Env (`.env.local` for dev, Vercel env for prod)
See `.env.example`. Key ones:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`OPENROUTER_API_KEY` (optional), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL`.

### 4. Run locally
```bash
cd web
npm install
cp .env.example .env.local     # fill it in
npm run dev                    # http://localhost:3000
```

### 5. Deploy to Vercel
- Import the `web/` folder as a Vercel project. Add all env vars. Deploy.
- Set `NEXT_PUBLIC_SITE_URL` to the deployed URL and add `/auth/callback` to the Google redirect URIs.

### 6. Deploy the cron sender
```bash
supabase functions deploy process-due
supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... CRON_SECRET=<random>
```
Then schedule it (SQL Editor) — see `supabase/migrations/0002_cron.sql` (fill in your project ref + secret). It runs every 5 min, finds due emails, and sends them.

## How sending works
Signing in with Google (Gmail scope) stores your **refresh token** in `profiles` (captured server-side in `/auth/callback`). Both the "Send now" button and the cron use it to mint a Gmail access token and send. **No Gmail token → dry-run** (marked sent, not delivered) so the whole flow is testable before wiring Google.

## Structure
```
web/
  app/
    layout.tsx, globals.css, page.tsx      shell + auth gate
    auth/callback/route.ts                 OAuth code exchange + token capture
    api/…                                  19 route handlers (all modules)
  components/  Login.tsx · Dashboard.tsx   full UI
  lib/         supabase · research · personalize · scheduler · template · parse · gmail · send
  supabase/
    migrations/0001_init.sql               schema + RLS + storage + trigger
    migrations/0002_cron.sql               cron schedule helper
    functions/process-due/index.ts         Deno edge function (cron sender)
```

## Scheduling
`generateSlots` computes every `send_at` in one pass. Config: `days`, `slot_hours`, `per_slot`, `timezone`, `spread` (6:00,6:12… vs all at :00).
