-- Reminders that reach the user (top-10 #2, 2026-09-30): web push morning digest.
-- Client: src/lib/push.js. Sender: supabase/functions/push (hourly via pg_cron).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tz text not null default 'UTC',
  hour smallint not null default 7 check (hour between 0 and 23),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sent_on date,
  fail_count integer not null default 0,
  last_error text
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subscriptions: read" on public.push_subscriptions;
create policy "own push subscriptions: read" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "own push subscriptions: delete" on public.push_subscriptions;
create policy "own push subscriptions: delete" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);
-- Inserts/updates go through save_push_subscription (a device can change account).

create table if not exists public.push_digests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  days jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.push_digests enable row level security;
drop policy if exists "own push digest" on public.push_digests;
create policy "own push digest" on public.push_digests
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_tz text, p_hour int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 2000 then raise exception 'bad endpoint'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, tz, hour)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(nullif(p_tz, ''), 'UTC'), greatest(0, least(23, coalesce(p_hour, 7))))
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    tz = excluded.tz, hour = excluded.hour, updated_at = now(), fail_count = 0, last_error = null;
end $$;
revoke all on function public.save_push_subscription(text, text, text, text, int) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text, int) to authenticated;

-- Secrets for the sender (VAPID keys are created by the function on first use; the private key never leaves the server).
create or replace function public.push_secret(p_name text)
returns text language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name and p_name like 'push_%' limit 1
$$;
revoke all on function public.push_secret(text) from public, anon, authenticated;
grant execute on function public.push_secret(text) to service_role;

create or replace function public.push_store_secret(p_name text, p_value text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_name not like 'push_%' then raise exception 'bad name'; end if;
  if exists (select 1 from vault.secrets where name = p_name) then return false; end if;
  perform vault.create_secret(p_value, p_name);
  return true;
end $$;
revoke all on function public.push_store_secret(text, text) from public, anon, authenticated;
grant execute on function public.push_store_secret(text, text) to service_role;

-- Shared secret the hourly cron job sends to the function.
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'push_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_cron_secret');
  end if;
end $$;
