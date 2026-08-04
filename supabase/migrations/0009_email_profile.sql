-- Per-user AI / email profile fields for compose personalization + template tokens.
alter table public.profiles
  add column if not exists ai_background text,
  add column if not exists university text,
  add column if not exists cgpa text,
  add column if not exists work_blurb text,
  add column if not exists phone text,
  add column if not exists linkedin_url text,
  add column if not exists target_intake text;
