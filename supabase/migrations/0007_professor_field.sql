-- Store each professor's research field (from the paper's OpenAlex topic), so
-- the found-professors list can show what area they work in. OpenAlex doesn't
-- expose a clean "department", so we use the topic's field/subfield instead.
alter table public.professor_emails add column if not exists field text;
