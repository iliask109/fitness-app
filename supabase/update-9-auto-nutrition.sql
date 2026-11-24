-- FitLogix update 9: nutrition goals are calculated automatically from body weight and recalculated every month.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.profiles
  add column if not exists nutrition_updated_on date,
  add column if not exists nutrition_weight numeric;
