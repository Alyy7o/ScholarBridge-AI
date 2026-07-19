-- ============================================================================
-- ScholarBridge — enable the automatic email sender.
--
-- STEP 1 (REQUIRED, do this FIRST in the Dashboard, not here):
--   Dashboard -> Database -> Extensions -> enable "pg_cron" AND "pg_net".
--   CREATE EXTENSION from the SQL editor does NOT work for these on managed
--   Supabase — they must be toggled on in the dashboard. Wait ~30s after.
--
-- STEP 2: replace the placeholders below, then run this whole file in the
--   SQL Editor:
--     <PROJECT_REF>      -> rrrnjwhfohdfagjmvqux (your project ref)
--     <SUPABASE_ANON_KEY>-> Dashboard -> Settings -> API -> anon public key
--     <CRON_SECRET>      -> the CRON_SECRET you set on the process-due function
--                           (leave the value empty string if you didn't set one)
-- ============================================================================

-- Remove any previous copy of this job so re-running is safe.
select cron.unschedule('scholarbridge-process-due')
where exists (select 1 from cron.job where jobname = 'scholarbridge-process-due');

-- Call the process-due edge function every minute.
-- The Authorization header (anon key) is REQUIRED — the function verifies JWT
-- by default, so without it every call is rejected with 401 before it runs.
select cron.schedule(
  'scholarbridge-process-due',
  '* * * * *',
  $$
    select net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/process-due',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SUPABASE_ANON_KEY>',
        'x-cron-secret', '<CRON_SECRET>'
      )
    );
  $$
);

-- Verify the job exists and is active.
select jobid, jobname, schedule, active from cron.job where jobname = 'scholarbridge-process-due';

-- After a minute, check runs + the actual HTTP status returned:
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
--   select id, status_code, created from net._http_response order by created desc limit 10;
