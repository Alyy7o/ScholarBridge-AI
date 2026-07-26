-- Count professors that have an email, grouped by country — powers the Email
-- cache page's per-country cards for EVERY country we've found emails in (not
-- just the priority five). Doing it in SQL avoids pulling the whole table client-side.

create or replace function public.email_country_counts()
returns table(country text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select country, count(*)::bigint
  from public.professor_emails
  where email is not null and coalesce(country, '') <> ''
  group by country
  order by count(*) desc;
$$;

grant execute on function public.email_country_counts() to authenticated, service_role;
