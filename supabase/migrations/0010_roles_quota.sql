-- Roles + lower default daily quota for all users.
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user'));

alter table public.profiles
  alter column daily_quota set default 20;

update public.profiles set daily_quota = 20 where daily_quota is distinct from 20;

update public.profiles
set role = 'admin'
where lower(email) = 'alijaved.developer@gmail.com';
