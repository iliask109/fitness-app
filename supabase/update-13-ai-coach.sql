-- FitLogix update 13: the AI coach (questions about training and nutrition, answered by Claude).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Counts questions per user per day, so the daily limit keeps the API bill in check.
-- Only the server (service_role) reads and writes it; users have no access.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select, insert, update, delete on public.ai_usage to service_role;
