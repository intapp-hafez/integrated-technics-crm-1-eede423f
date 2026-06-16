
select cron.schedule(
  'notification-scans-hourly',
  '0 * * * *',
  $$ select public.run_notification_scans(); $$
);
