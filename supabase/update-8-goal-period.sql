-- FitLogix update 8: goal period chosen in the training profile (3 months, half a year or a year).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.profiles
  add column if not exists goal_months int check (goal_months in (3, 6, 12)),
  add column if not exists goal_start date;
