-- FitLogix update 12: app language per user (Hebrew or English), also used for push reminders.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.profiles
  add column if not exists language text check (language in ('he', 'en'));
