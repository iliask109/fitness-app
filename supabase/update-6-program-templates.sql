-- FitLogix update 6: ready-made programs managed by admins from inside the app.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again
-- (the starting programs are only added if they are not there yet).

create table if not exists public.program_templates (
  id text primary key default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  sort_order int not null default 0,
  name text not null,
  description text not null default '',
  category text not null check (category in ('gym', 'home', 'outdoor')),
  equipment text not null default '',
  schedule jsonb not null,
  days jsonb not null default '[]'
);

alter table public.program_templates enable row level security;
drop policy if exists "everyone reads" on public.program_templates;
create policy "everyone reads" on public.program_templates for select to authenticated using (true);
drop policy if exists "admins write" on public.program_templates;
create policy "admins write" on public.program_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.program_templates to authenticated;
grant select, insert, update, delete on public.program_templates to service_role;

insert into public.program_templates (id, sort_order, name, description, category, equipment, schedule, days) values
  ('tpl-gym-beginner', 10, $q$מתחילים: כל הגוף$q$, $q$3 אימונים בשבוע, כל הגוף בכל אימון$q$, 'gym', $q$מכון כושר$q$,
   $q${"kind":"weekly","weekdays":[0,2,4],"required":3}$q$::jsonb,
   $q$[{"name":"אימון A","exercises":[{"name":"סקוואט","sets":3,"reps":8},{"name":"לחיצת חזה במוט","sets":3,"reps":8},{"name":"חתירה במוט","sets":3,"reps":8},{"name":"פלאנק","sets":3,"reps":30}]},{"name":"אימון B","exercises":[{"name":"דדליפט","sets":3,"reps":5},{"name":"לחיצת כתפיים","sets":3,"reps":8},{"name":"פולי עליון","sets":3,"reps":10},{"name":"לאנג׳ים","sets":3,"reps":10}]}]$q$::jsonb),
  ('tpl-gym-ppl', 20, $q$Push / Pull / Legs$q$, $q$4 אימונים בשבוע: דחיפה, משיכה ורגליים ברוטציה$q$, 'gym', $q$מכון כושר$q$,
   $q${"kind":"weekly","weekdays":[0,1,3,4],"required":4}$q$::jsonb,
   $q$[{"name":"Push: דחיפה","exercises":[{"name":"לחיצת חזה במוט","sets":4,"reps":6},{"name":"לחיצת חזה בשיפוע עליון","sets":3,"reps":10},{"name":"לחיצת כתפיים","sets":3,"reps":8},{"name":"הרחקה לצדדים","sets":3,"reps":15},{"name":"פשיטת מרפקים בכבל","sets":3,"reps":12}]},{"name":"Pull: משיכה","exercises":[{"name":"מתח","sets":4,"reps":6},{"name":"חתירה במוט","sets":3,"reps":8},{"name":"חתירה בכבל","sets":3,"reps":12},{"name":"פייס פול","sets":3,"reps":15},{"name":"כפיפת מרפקים במוט","sets":3,"reps":10}]},{"name":"Legs: רגליים","exercises":[{"name":"סקוואט","sets":4,"reps":6},{"name":"דדליפט רומני","sets":3,"reps":8},{"name":"לחיצת רגליים","sets":3,"reps":12},{"name":"כפיפת ברכיים","sets":3,"reps":12},{"name":"הרמות עקב","sets":4,"reps":15}]}]$q$::jsonb),
  ('tpl-gym-upper-lower', 30, $q$עליון / תחתון$q$, $q$4 אימונים בשבוע: עליון ותחתון לסירוגין$q$, 'gym', $q$מכון כושר$q$,
   $q${"kind":"weekly","weekdays":[0,1,3,4],"required":4}$q$::jsonb,
   $q$[{"name":"עליון","exercises":[{"name":"לחיצת חזה במוט","sets":4,"reps":6},{"name":"חתירה במוט","sets":4,"reps":6},{"name":"לחיצת כתפיים","sets":3,"reps":10},{"name":"פולי עליון","sets":3,"reps":10},{"name":"כפיפת פטישים","sets":3,"reps":12}]},{"name":"תחתון","exercises":[{"name":"סקוואט","sets":4,"reps":6},{"name":"דדליפט רומני","sets":3,"reps":8},{"name":"לאנג׳ים","sets":3,"reps":10},{"name":"הרמות עקב","sets":4,"reps":15},{"name":"הרמות רגליים בתלייה","sets":3,"reps":12}]}]$q$::jsonb),
  ('tpl-gym-split5', 40, $q$ספליט 5 ימים$q$, $q$5 אימונים בשבוע, קבוצת שרירים אחת בכל אימון$q$, 'gym', $q$מכון כושר$q$,
   $q${"kind":"weekly","weekdays":[0,1,2,3,4],"required":5}$q$::jsonb,
   $q$[{"name":"חזה","exercises":[{"name":"לחיצת חזה במוט","sets":4,"reps":8},{"name":"לחיצת חזה בשיפוע עליון","sets":4,"reps":10},{"name":"לחיצת חזה במשקולות","sets":3,"reps":10},{"name":"פרפר במכונה","sets":3,"reps":12},{"name":"מקבילים","sets":3,"reps":10}]},{"name":"גב","exercises":[{"name":"מתח","sets":4,"reps":6},{"name":"חתירה במוט","sets":4,"reps":8},{"name":"פולי עליון","sets":3,"reps":10},{"name":"חתירה בכבל","sets":3,"reps":12},{"name":"דדליפט","sets":3,"reps":5}]},{"name":"רגליים","exercises":[{"name":"סקוואט","sets":4,"reps":6},{"name":"לחיצת רגליים","sets":4,"reps":10},{"name":"דדליפט רומני","sets":3,"reps":8},{"name":"פשיטת ברכיים","sets":3,"reps":12},{"name":"כפיפת ברכיים","sets":3,"reps":12},{"name":"הרמות עקב","sets":4,"reps":15}]},{"name":"כתפיים","exercises":[{"name":"לחיצת כתפיים","sets":4,"reps":8},{"name":"הרחקה לצדדים","sets":4,"reps":15},{"name":"פרפר אחורי","sets":3,"reps":15},{"name":"פייס פול","sets":3,"reps":15}]},{"name":"ידיים ובטן","exercises":[{"name":"כפיפת מרפקים במוט","sets":4,"reps":10},{"name":"כפיפת פטישים","sets":3,"reps":12},{"name":"פשיטת מרפקים בכבל","sets":4,"reps":12},{"name":"לחיצה צרפתית","sets":3,"reps":10},{"name":"הרמות רגליים בתלייה","sets":3,"reps":12},{"name":"פלאנק","sets":3,"reps":45}]}]$q$::jsonb),
  ('tpl-home-bodyweight', 50, $q$בבית: משקל גוף$q$, $q$3 אימונים בשבוע, כל הגוף, בלי שום ציוד$q$, 'home', $q$בלי ציוד (רק כיסא יציב ומזרן)$q$,
   $q${"kind":"weekly","weekdays":[0,2,4],"required":3}$q$::jsonb,
   $q$[{"name":"כל הגוף A","exercises":[{"name":"סקוואט במשקל גוף","sets":4,"reps":15},{"name":"שכיבות סמיכה","sets":4,"reps":10},{"name":"לאנג׳ים","sets":3,"reps":12},{"name":"גשר ישבן","sets":3,"reps":15},{"name":"דיפס על כיסא","sets":3,"reps":10},{"name":"פלאנק","sets":3,"reps":30}]},{"name":"כל הגוף B","exercises":[{"name":"סקוואט בולגרי","sets":3,"reps":10},{"name":"שכיבות סמיכה צרות","sets":3,"reps":10},{"name":"סופרמן","sets":3,"reps":15},{"name":"שכיבות סמיכה פייק","sets":3,"reps":8},{"name":"מטפסי הרים","sets":3,"reps":30},{"name":"בורפיז","sets":3,"reps":10}]}]$q$::jsonb),
  ('tpl-home-dumbbells', 60, $q$בבית: משקולות יד$q$, $q$4 אימונים בשבוע: עליון ותחתון לסירוגין$q$, 'home', $q$זוג משקולות יד$q$,
   $q${"kind":"weekly","weekdays":[0,1,3,4],"required":4}$q$::jsonb,
   $q$[{"name":"עליון","exercises":[{"name":"לחיצת חזה במשקולות","sets":4,"reps":10},{"name":"חתירה במשקולת","sets":4,"reps":10},{"name":"לחיצת כתפיים במשקולות","sets":3,"reps":10},{"name":"הרחקה לצדדים","sets":3,"reps":15},{"name":"כפיפת מרפקים במשקולות","sets":3,"reps":12},{"name":"פשיטת מרפקים מעל הראש","sets":3,"reps":12}]},{"name":"תחתון","exercises":[{"name":"סקוואט גביע","sets":4,"reps":12},{"name":"דדליפט רומני במשקולות","sets":4,"reps":10},{"name":"לאנג׳ים","sets":3,"reps":12},{"name":"גשר ישבן","sets":3,"reps":15},{"name":"הרמות עקב","sets":4,"reps":20},{"name":"פלאנק","sets":3,"reps":40}]}]$q$::jsonb),
  ('tpl-outdoor-beginner', 70, $q$גינת כושר: מתחילים$q$, $q$3 אימונים בשבוע, כל הגוף על המתקנים$q$, 'outdoor', $q$מוט מתח, מקבילים וספסל$q$,
   $q${"kind":"weekly","weekdays":[0,2,4],"required":3}$q$::jsonb,
   $q$[{"name":"כל הגוף A","exercises":[{"name":"מתח אוסטרלי","sets":4,"reps":10},{"name":"שכיבות סמיכה","sets":4,"reps":12},{"name":"סקוואט במשקל גוף","sets":4,"reps":15},{"name":"דיפס על ספסל","sets":3,"reps":12},{"name":"הרמות ברכיים בתלייה","sets":3,"reps":10},{"name":"פלאנק","sets":3,"reps":30}]},{"name":"כל הגוף B","exercises":[{"name":"מתח","sets":4,"reps":5},{"name":"שכיבות סמיכה בשיפוע","sets":3,"reps":12},{"name":"לאנג׳ים","sets":3,"reps":12},{"name":"מקבילים","sets":3,"reps":6},{"name":"סקוואט בולגרי","sets":3,"reps":10},{"name":"כפיפות בטן","sets":3,"reps":20}]}]$q$::jsonb),
  ('tpl-outdoor-calisthenics', 80, $q$קליסטניקס: עליון / תחתון$q$, $q$4 אימונים בשבוע למי שכבר עושה מתח ומקבילים$q$, 'outdoor', $q$מוט מתח, מקבילים וספסל$q$,
   $q${"kind":"weekly","weekdays":[0,1,3,4],"required":4}$q$::jsonb,
   $q$[{"name":"עליון","exercises":[{"name":"מתח","sets":5,"reps":6},{"name":"מקבילים","sets":4,"reps":10},{"name":"מתח אוסטרלי","sets":3,"reps":12},{"name":"שכיבות סמיכה פייק","sets":3,"reps":10},{"name":"שכיבות סמיכה","sets":3,"reps":20},{"name":"הרמות רגליים בתלייה","sets":4,"reps":10}]},{"name":"תחתון","exercises":[{"name":"סקוואט בולגרי","sets":4,"reps":10},{"name":"קפיצות לספסל","sets":4,"reps":8},{"name":"לאנג׳ים בהליכה","sets":3,"reps":20},{"name":"פיסטול סקוואט בעזרה","sets":3,"reps":6},{"name":"הרמות עקב","sets":4,"reps":20},{"name":"פלאנק צידי","sets":3,"reps":30}]}]$q$::jsonb)
on conflict (id) do nothing;
