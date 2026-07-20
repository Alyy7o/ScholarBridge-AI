-- Background email-harvest progress. A 1-minute cron ticks the crawl forward one
-- page at a time; state (cursor + counts) lives here so it survives restarts.

create table if not exists public.harvest_state (
  country     text primary key,          -- ISO code, e.g. "cn"
  cursor      text not null default '*',  -- OpenAlex pagination cursor
  status      text not null default 'pending', -- pending | running | done
  papers      int not null default 0,
  emails      int not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists public.harvest_control (
  id         int primary key default 1,
  active     boolean not null default false,
  order_list text[] not null default '{cn,jp,kr,tw,sg}',
  updated_at timestamptz not null default now()
);

insert into public.harvest_control (id) values (1) on conflict (id) do nothing;

-- Seed the priority countries.
insert into public.harvest_state (country) values ('cn'),('jp'),('kr'),('tw'),('sg')
  on conflict (country) do nothing;

alter table public.harvest_state   enable row level security;
alter table public.harvest_control enable row level security;
drop policy if exists "read_harvest_state" on public.harvest_state;
create policy "read_harvest_state" on public.harvest_state for select using (auth.role() = 'authenticated');
drop policy if exists "read_harvest_control" on public.harvest_control;
create policy "read_harvest_control" on public.harvest_control for select using (auth.role() = 'authenticated');
