-- ScholarBridge AI — full schema, RLS, storage, signup trigger.

-- ── profiles (1:1 with auth.users) ───────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  sender_name text,
  gmail_refresh_token text,          -- to send via Gmail from the cron function
  gmail_email text,
  daily_quota int not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── professors ───────────────────────────────────────────────────
create table if not exists public.professors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  university text default '',
  topics text default '',
  created_at timestamptz not null default now(),
  unique (user_id, email)
);
create index if not exists professors_user on public.professors(user_id);

-- ── email templates ──────────────────────────────────────────────
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text default '',
  body text default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists templates_user on public.email_templates(user_id);

-- ── attachments (files live in Storage; row is metadata) ─────────
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'cv',
  filename text not null,
  mime text,
  size int,
  storage_path text not null,        -- path in the 'attachments' bucket
  created_at timestamptz not null default now()
);
create index if not exists attachments_user on public.attachments(user_id);

-- ── scheduled emails ─────────────────────────────────────────────
create table if not exists public.scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  professor_name text default '',
  email text not null,
  university text default '',
  topics text default '',
  subject text default '',
  body text default '',
  personalized text default '',
  send_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('draft','scheduled','paused','sent','failed','cancelled')),
  workflow text default '',
  research_source text default 'none',
  papers_used jsonb default '[]'::jsonb,
  attachment_ids jsonb default '[]'::jsonb,
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists emails_user on public.scheduled_emails(user_id);
create index if not exists emails_due on public.scheduled_emails(status, send_at);

-- ── email logs (send attempts) ───────────────────────────────────
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_id uuid references public.scheduled_emails(id) on delete cascade,
  status text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists logs_email on public.email_logs(email_id);

-- ── RLS: every row is scoped to its owner ────────────────────────
alter table public.profiles          enable row level security;
alter table public.professors        enable row level security;
alter table public.email_templates   enable row level security;
alter table public.attachments       enable row level security;
alter table public.scheduled_emails  enable row level security;
alter table public.email_logs        enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['professors','email_templates','attachments','scheduled_emails','email_logs'])
  loop
    execute format($f$
      drop policy if exists "owner_all" on public.%1$s;
      create policy "owner_all" on public.%1$s
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end$$;

drop policy if exists "own_profile" on public.profiles;
create policy "own_profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ── signup trigger: create a profile row automatically ───────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, sender_name)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── storage bucket for attachments (private) ─────────────────────
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "att_owner" on storage.objects;
create policy "att_owner" on storage.objects
  for all to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid())
  with check (bucket_id = 'attachments' and owner = auth.uid());
