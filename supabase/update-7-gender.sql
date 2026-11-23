-- FitLogix update 7: gender chosen at sign-up (used for wording such as "אתה בטוח?" / "את בטוחה?").
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female'));

-- Same as update 2, plus the gender from the sign-up form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  begin
    insert into public.profiles (id, user_id, first_name, last_name, display_name, age, birth_date, gender)
    values (
      new.id::text, new.id,
      nullif(trim(m->>'first_name'), ''),
      nullif(trim(m->>'last_name'), ''),
      nullif(trim(m->>'first_name'), ''),
      case when m->>'age' ~ '^\d{1,3}$' then (m->>'age')::int end,
      case when m->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$' then (m->>'birth_date')::date end,
      case when m->>'gender' in ('male', 'female') then m->>'gender' end
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: %', sqlerrm;
  end;
  return new;
end $$;
