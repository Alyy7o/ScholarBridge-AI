-- Professor buckets: named groups the user can sort professors into, then target
-- when composing. Many-to-many — a professor may live in several buckets.

create table if not exists public.professor_buckets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists professor_buckets_user on public.professor_buckets(user_id);

create table if not exists public.professor_bucket_members (
  bucket_id    uuid not null references public.professor_buckets(id) on delete cascade,
  professor_id uuid not null references public.professors(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (bucket_id, professor_id)
);
create index if not exists pbm_bucket on public.professor_bucket_members(bucket_id);
create index if not exists pbm_professor on public.professor_bucket_members(professor_id);

alter table public.professor_buckets        enable row level security;
alter table public.professor_bucket_members enable row level security;

drop policy if exists "owner_all" on public.professor_buckets;
create policy "owner_all" on public.professor_buckets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.professor_bucket_members;
create policy "owner_all" on public.professor_bucket_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
