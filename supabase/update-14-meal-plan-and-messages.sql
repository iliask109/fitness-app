-- FitLogix update 14: a daily meal plan per user (built automatically, editable by the user and by admins)
-- and a message thread between each user and the admins.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

-- ---------- Meal plan: one row per user (id = the user's id) ----------
create table if not exists public.meal_plans (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  items jsonb not null default '[]',      -- [{ slot, meal_id, portion }]
  calorie_goal int,                       -- the goal the portions were sized for
  edited_by_admin boolean not null default false
);
alter table public.meal_plans enable row level security;
drop policy if exists "own rows" on public.meal_plans;
create policy "own rows" on public.meal_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admins all" on public.meal_plans;
create policy "admins all" on public.meal_plans for all using (public.is_admin()) with check (public.is_admin());
create index if not exists meal_plans_user_idx on public.meal_plans (user_id);
grant select, insert, update, delete on public.meal_plans to authenticated;
grant select, insert, update, delete on public.meal_plans to service_role;

-- ---------- Messages: user_id is the user whose thread it is ----------
create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  sender text not null check (sender in ('user', 'admin')),
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz
);
alter table public.messages enable row level security;
drop policy if exists "own thread: read" on public.messages;
create policy "own thread: read" on public.messages for select using (user_id = auth.uid());
drop policy if exists "own thread: write" on public.messages;
create policy "own thread: write" on public.messages for insert with check (user_id = auth.uid() and sender = 'user');
drop policy if exists "own thread: mark read" on public.messages;
create policy "own thread: mark read" on public.messages for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admins all" on public.messages;
create policy "admins all" on public.messages for all using (public.is_admin()) with check (public.is_admin());
create index if not exists messages_user_idx on public.messages (user_id, created_at);
-- Messages cannot be edited, only marked as read.
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant select, insert, update, delete on public.messages to service_role;
