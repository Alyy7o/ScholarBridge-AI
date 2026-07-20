-- Shared cache of professor emails scraped from their papers (built once, reused
-- for everyone). Written by the server (service role); readable by any signed-in
-- user. Grows from on-demand lookups and from the country batch crawler.

create table if not exists public.professor_emails (
  openalex_id     text primary key,           -- e.g. "A5023888391"
  name            text,
  email           text,
  domain          text,
  institution     text,
  country         text,                        -- ISO code, e.g. "cn"
  source_work_ids text[] not null default '{}',
  times_seen      int not null default 1,
  first_seen_year int,
  last_seen_year  int,
  confidence      text not null default 'low', -- 'high' | 'low'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists prof_emails_country on public.professor_emails(country);
create index if not exists prof_emails_email   on public.professor_emails(email);

alter table public.professor_emails enable row level security;

drop policy if exists "read_professor_emails" on public.professor_emails;
create policy "read_professor_emails" on public.professor_emails
  for select using (auth.role() = 'authenticated');
