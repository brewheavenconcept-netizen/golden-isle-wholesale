-- ==============================================================================
-- Golden Isle Wholesale - Proactive 30-Day WhatsApp Chaser (pg_cron setup)
-- ==============================================================================
-- This script sets up pg_cron jobs in Supabase to hit your Next.js API endpoints.

-- 1. Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the 30-Day Repeat Order cron job
-- This runs every day at 01:00 UTC (09:00 AM Malaysia Time GMT+8).
SELECT cron.schedule(
  'golden-isle-30-day-chaser', 
  '0 1 * * *',
  $$
    SELECT net.http_post(
      url:='https://goldenisle-wholesale.vercel.app/api/whatsapp/cron-repeat',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer golden_isle_secret_cron_token"}'::jsonb
    );
  $$
);

-- 3. Schedule the UNPAID Invoice Chaser cron job
-- This runs every hour. The API logic itself filters by 9AM - 6PM MYT time.
SELECT cron.schedule(
  'unpaid_invoice_chaser', 
  '0 * * * *',
  $$
    SELECT net.http_get(
      url:='https://goldenisle-wholesale.vercel.app/api/whatsapp/cron-chaser',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer golden_isle_secret_cron_token"}'::jsonb
    );
  $$
);

-- Note: To unschedule these jobs later if needed, run:
-- SELECT cron.unschedule('golden-isle-30-day-chaser');
-- SELECT cron.unschedule('unpaid_invoice_chaser');
