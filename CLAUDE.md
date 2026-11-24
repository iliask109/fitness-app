# FitLogix: notes for Claude

## Working with the owner
- **Always reply in Hebrew**, in plain language. The owner is not a developer: explain Supabase/Vercel/GitHub steps click by click, and say exactly what to paste where.
- Never ask the owner to paste secret keys into chat (Supabase secret key, VAPID private key, CRON_SECRET). They go only into Vercel / Supabase settings.
- After each change: build, test in a browser (Playwright, demo build), commit, push to `main`, and confirm the Vercel deploy succeeded (`gh api repos/iliask109/fitness-app/commits/<sha>/status`). Tell the owner to refresh with Ctrl+Shift+R if the site looks old.
- When a change needs SQL, add a new numbered `supabase/update-N-*.sql` (idempotent: `if not exists`, `create or replace`), run `npm run sql:setup`, and give the owner the GitHub link to the file. The admin area lists updates not yet run (`src/lib/schemaCheck.ts`: add new columns/tables there too).
- New Supabase tables need explicit grants to `authenticated` and `service_role` (this project does not grant them by default).

## What it is
Hebrew RTL fitness PWA. Live: https://fitness-app-khaki-iota.vercel.app (Vercel, auto-deploys `main`). Database/auth: Supabase project `psjizccptbnbgsovnzys`. See README.md for features and setup.

## Commands
- `npm run dev` (no `.env.local` = demo mode: data in localStorage, any email logs in, first user is admin)
- `npm test` (vitest, `tests/`), `npm run typecheck` (app + `api/`), `npm run build` (also bundles `api/_lib/reminders.js`)
- Demo build for browser tests: `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite build --outDir <dir>` then `npx vite preview --outDir <dir> --port <p>`.
- Offline/sync tests need a Supabase-mode build pointed at a fake URL (e.g. `https://mock.supabase.co`) with requests answered by Playwright `context.route`, and the route must abort while "offline" (setOffline alone does not stop routed requests).
- Local Postgres 16 is available for testing SQL (mock `auth` schema, roles `anon`, `authenticated`, `service_role`).

## Architecture (src/)
- `lib/db.ts`: Supabase or localStorage. Saving drops columns the database doesn't have yet (with a console warning).
- `lib/tableStore.ts` + `lib/useTable.ts`: one shared copy per table per user, refreshed when stale; device copy for offline; outbox of offline changes synced on reconnect / app open / every minute.
- `lib/schedule.ts`: today's workout and week plan (`cycle` or `weekly` schedules, rotation, missed workouts not skipped). `lib/reminders.ts`: who gets a push reminder and what it says (shared with `api/reminders.ts`).
- `lib/templates.ts` (built-in programs; live ones are in the `program_templates` table, admin-managed), `lib/exercises.ts` + `lib/exerciseGuide.ts` (53 exercises, every library exercise must have a guide; a test enforces it).
- `lib/workoutDraft.ts`: unfinished workout kept on the device for an hour.
- `lib/mealPlan.ts`: meal library + daily menu (`meal_plans`, one row per user, id = user id), built in `UserShell` from the calorie goal and re-sized when it changes unless an admin edited it (`components/AdminMealPlan.tsx`). `lib/messages.ts`: user ↔ admin threads (`messages`, insert-only for users), `components/MessageThread.tsx` in Settings and `pages/AdminMessages.tsx`.
- `App.tsx`: admins get `AdminShell` (users, programs, account), others `UserShell` (onboarding gate, tabs). Heavy pages are lazy-loaded.
- `public/sw.js`: offline app shell (pages network-first, `/assets` precached from `precache-manifest.json`) + push notifications. Registered as `/sw.js?v=<build id>`.
- `api/`: Vercel functions `reminders.ts` (pg_cron every 15 min, `CRON_SECRET`) and `test-push.ts`. Imports inside `api/` need explicit `.js` extensions (ESM).

## Conventions
- Two languages (user picks in Settings, saved on `profiles.language` and the device): write every UI text as `tr('עברית', 'English')` (`lib/i18n.ts`). Stored Hebrew content (exercise, program, food names) is shown with `tx(name)`; add new built-in names to `lib/contentEn.ts` and new exercise guides to `lib/exerciseGuideEn.ts` (tests enforce both). Gendered Hebrew: `tr(byGender(...), 'English')`. The admin area is Hebrew only. Server texts (reminders) read `profile.language`.
- Numbers like `60×8` inside Hebrew text need `dir="ltr"` or they display reversed.
- Colors only through CSS tokens in `styles.css` (light + dark via `data-theme`); "soft & rounded" look, Varela Round font.
- No `alert()`/`confirm()`: use in-page confirmations (`components/ConfirmInline.tsx`); gendered wording via `lib/gender.ts`.
- Workout history is read-only (`pages/WorkoutView.tsx`); only new workouts are edited (`pages/WorkoutEditor.tsx`).
