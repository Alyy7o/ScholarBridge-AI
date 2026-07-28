-- Flag set when a user's stored Google refresh token stops working (expired /
-- revoked), so the app can prompt them to reconnect Gmail. Cleared when a fresh
-- token is captured on re-login or when a send next succeeds.
alter table public.profiles
  add column if not exists gmail_needs_reconnect boolean not null default false;
