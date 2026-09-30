-- Hourly delivery of the morning digest (supabase/functions/push, action "send").
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'push-digest-hourly';
select cron.schedule('push-digest-hourly', '0 * * * *', $cron$
  select net.http_post(
    url := 'https://fosqnppqcsoowqvrlkul.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')),
    body := '{"action":"send"}'::jsonb,
    timeout_milliseconds := 60000
  );
$cron$);
