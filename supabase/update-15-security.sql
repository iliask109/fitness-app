-- FitLogix update 15: security hardening (from the security review).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Run it after update 14.

do $$
declare
  c record;
begin
  -- 1. Rows whose id is the user's id (profile, meal plan) must belong to that same user,
  --    so nobody can take another user's id first. "not valid" = checked for new and changed rows.
  if not exists (select 1 from pg_constraint where conname = 'profiles_id_is_user') then
    alter table public.profiles add constraint profiles_id_is_user check (id = user_id::text) not valid;
  end if;
  if to_regclass('public.meal_plans') is not null and not exists (select 1 from pg_constraint where conname = 'meal_plans_id_is_user') then
    alter table public.meal_plans add constraint meal_plans_id_is_user check (id = user_id::text) not valid;
  end if;

  -- 2. Reasonable lengths for free text, so nobody can fill the database with huge rows.
  for c in select * from (values
    ('profiles', 'first_name', 60), ('profiles', 'last_name', 60), ('profiles', 'display_name', 60),
    ('meals', 'name', 200), ('workouts', 'name', 200), ('workouts', 'notes', 5000), ('programs', 'name', 200)
  ) as t(tbl, col, len) loop
    if not exists (select 1 from pg_constraint where conname = c.tbl || '_' || c.col || '_len') then
      execute format('alter table public.%I add constraint %I check (char_length(%I) <= %s) not valid',
        c.tbl, c.tbl || '_' || c.col || '_len', c.col, c.len);
    end if;
  end loop;
end $$;

-- 3. At most 20 messages from a user in 10 minutes (stops message flooding).
create or replace function public.messages_rate_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.sender = 'user' and (
    select count(*) from public.messages
    where user_id = new.user_id and sender = 'user' and created_at > now() - interval '10 minutes'
  ) >= 20 then
    raise exception 'too many messages';
  end if;
  return new;
end $$;
revoke execute on function public.messages_rate_limit() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.messages') is not null then
    drop trigger if exists messages_rate_limit on public.messages;
    create trigger messages_rate_limit before insert on public.messages
      for each row execute function public.messages_rate_limit();
  end if;
end $$;
