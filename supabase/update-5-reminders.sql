-- FitLogix update 5: workout reminders (push notifications).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.profiles
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_time text,
  add column if not exists reminder_tz text,
  add column if not exists remind_training_day boolean not null default true,
  add column if not exists remind_no_workout boolean not null default true,
  add column if not exists last_reminded_on date;

-- One row per device that allowed notifications.
create table if not exists public.push_subscriptions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  endpoint text not null,
  p256dh text not null,
  auth text not null
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own rows" on public.push_subscriptions;
create policy "own rows" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;
