-- FitLogix update 16: the ready-made "5-day split" becomes a 4-day split.
-- The shoulder day is gone: front and side shoulders moved to the chest day, the rear shoulder to the back day.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Users who already copied the 5-day split keep their own copy; only the ready-made program changes.

update public.program_templates set
  name = $q$ספליט 4 ימים$q$,
  description = $q$4 אימונים בשבוע: חזה וכתפיים, גב וכתף אחורית, רגליים, ידיים ובטן$q$,
  schedule = $q${"kind":"weekly","weekdays":[0,1,3,4],"required":4}$q$::jsonb,
  days = $q$[{"name": "חזה וכתפיים", "exercises": [{"name": "לחיצת חזה במוט", "sets": 4, "reps": 8}, {"name": "לחיצת חזה בשיפוע עליון", "sets": 4, "reps": 10}, {"name": "פרפר במכונה", "sets": 3, "reps": 12}, {"name": "לחיצת כתפיים", "sets": 3, "reps": 8}, {"name": "הרחקה לצדדים", "sets": 4, "reps": 15}, {"name": "מקבילים", "sets": 3, "reps": 10}]}, {"name": "גב וכתף אחורית", "exercises": [{"name": "מתח", "sets": 4, "reps": 6}, {"name": "חתירה במוט", "sets": 4, "reps": 8}, {"name": "פולי עליון", "sets": 3, "reps": 10}, {"name": "דדליפט", "sets": 3, "reps": 5}, {"name": "פרפר אחורי", "sets": 3, "reps": 15}, {"name": "פייס פול", "sets": 3, "reps": 15}]}, {"name": "רגליים", "exercises": [{"name": "סקוואט", "sets": 4, "reps": 6}, {"name": "לחיצת רגליים", "sets": 4, "reps": 10}, {"name": "דדליפט רומני", "sets": 3, "reps": 8}, {"name": "פשיטת ברכיים", "sets": 3, "reps": 12}, {"name": "כפיפת ברכיים", "sets": 3, "reps": 12}, {"name": "הרמות עקב", "sets": 4, "reps": 15}]}, {"name": "ידיים ובטן", "exercises": [{"name": "כפיפת מרפקים במוט", "sets": 4, "reps": 10}, {"name": "כפיפת פטישים", "sets": 3, "reps": 12}, {"name": "פשיטת מרפקים בכבל", "sets": 4, "reps": 12}, {"name": "לחיצה צרפתית", "sets": 3, "reps": 10}, {"name": "הרמות רגליים בתלייה", "sets": 3, "reps": 12}, {"name": "פלאנק", "sets": 3, "reps": 45}]}]$q$::jsonb
where id = 'tpl-gym-split5';
