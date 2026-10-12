-- Paddle webhooks are not delivered in order. The profile remembers the
-- occurred_at of the last applied event so a late "subscription.updated"
-- cannot undo a "subscription.canceled" (supabase/functions/paddle-webhook).
alter table public.profiles add column if not exists paddle_event_at timestamptz;
