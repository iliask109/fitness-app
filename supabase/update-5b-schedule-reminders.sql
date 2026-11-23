-- FitLogix update 5b: check for reminders every 15 minutes.
-- Replace YOUR-SITE and YOUR-CRON-SECRET (the same value as CRON_SECRET in Vercel), then run.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('fitlogix-reminders') where exists (select 1 from cron.job where jobname = 'fitlogix-reminders');

select cron.schedule('fitlogix-reminders', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-SITE.vercel.app/api/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR-CRON-SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);
