-- FitLogix update 3: training profile filled in after sign-up.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.profiles
  add column if not exists height_cm int,
  add column if not exists experience text,
  add column if not exists fitness_goal text,
  add column if not exists training_days int,
  add column if not exists training_locations jsonb,
  add column if not exists equipment jsonb,
  add column if not exists onboarded_at timestamptz;
