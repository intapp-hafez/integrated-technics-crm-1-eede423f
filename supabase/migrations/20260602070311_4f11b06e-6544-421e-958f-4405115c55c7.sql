-- Schedule a cron job to dispatch queued email_jobs via the SMTP relay endpoint.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Seed Hostinger defaults if no SMTP row yet (id=1, password left blank for the user to fill in).
insert into public.smtp_settings (id, provider, host, port, secure, username, password, from_email, from_name, reply_to, enabled)
values (1, 'Hostinger', 'smtp.hostinger.com', 465, true, '', '', '', 'INT-CRM', null, false)
on conflict (id) do nothing;

-- Remove any previously-scheduled job with the same name.
do $$
declare jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'dispatch-email-jobs';
  if jid is not null then perform cron.unschedule(jid); end if;
end $$;

select cron.schedule(
  'dispatch-email-jobs',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://api.example.com/public/email/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YmV5dW9obnl4YWNnaHhrYmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDAzNzEsImV4cCI6MjA5NTMxNjM3MX0.Pgty7B6TPn5rCo4-FF1CkwhsqKdcGBlxzau3GpZImTI'
    ),
    body := jsonb_build_object('source', 'pg_cron', 'ts', now())
  ) as request_id;
  $$
);