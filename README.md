# FitLogix 💪

A Hebrew (RTL) fitness web app: training programs with a weekly schedule, workout logging, progress tracking, nutrition, workout reminders and an admin area. Built with React + Vite, Supabase (auth + Postgres) and Vercel (hosting + two small serverless functions). Installable on phones as a PWA.

## Features

- **Sign-up** with name, gender, age, optional birth date, then a required training profile (height, weight, experience, goal, days per week, where you train, equipment).
- **Home**: greeting and clock, today's planned workout, unfinished workout to resume (kept for an hour), weekly goal and a week chart with done and planned days, quick weight entry.
- **Programs**: ready-made programs by category (gym / home / outdoor equipment), one active program at a time, training days per program (e.g. 4 for Push/Pull/Legs), rotation across those days.
- **Workouts**: one exercise open at a time, reorder, rest timer, sets prefilled from last time, per-exercise notes, exercise guides (53 exercises). History is read-only with a calendar and filters.
- **Progress**: body weight, workouts per week, calories, working weights per exercise, personal records.
- **Reminders**: push notifications at a chosen time on training days, or when no workout was done this week.
- **Admin**: users (progress, block, delete, make admin) and the ready-made programs (add, edit, delete).
- **Account**: password recovery by emailed code, change password, light/dark theme.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase keys (`.env.local`) the app runs in **demo mode**: data stays in the browser, any email signs in, and the first user becomes admin.

## Set up a new Supabase project

1. Create a project at https://supabase.com.
2. **SQL Editor → New query**: paste all of `supabase/setup.sql` → **Run**.
3. Sign up in the app, then make yourself admin (SQL Editor):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'YOUR-EMAIL';
   ```
4. **Authentication**:
   - *Sign In / Providers → Email*: turn off **Confirm email** if sign-up should work without email confirmation.
   - *Emails → Reset Password*: use the template in `supabase/email-reset-password.html` (Hebrew, with the code).
   - *Emails → SMTP Settings*: connect an SMTP provider (e.g. Gmail with an app password) so emails reach all users; raise the email rate limit.
   - *URL Configuration*: set **Site URL** to the deployed address.
5. Put the project URL and publishable key in `.env.local` (local) or `.env.production` (deploy):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

### Updating an existing project

Run only the `supabase/update-*.sql` files that have not been run yet. When signed in as admin, the app lists the missing ones at the top of the admin area. After changing any SQL file, regenerate the one-paste setup with `npm run sql:setup`.

## Deploy (Vercel)

Import the GitHub repository in Vercel (no build settings needed). For workout reminders:

1. **Vercel → Settings → Environment Variables**: `SUPABASE_SERVICE_ROLE_KEY` (Supabase secret key), `VAPID_PRIVATE_KEY`, `CRON_SECRET`. Then redeploy.
   Generate a VAPID key pair with `npx web-push generate-vapid-keys`; the public key goes in `VITE_VAPID_PUBLIC_KEY` and `api/_shared.ts`.
2. **Supabase SQL Editor**: run `supabase/update-5b-schedule-reminders.sql` with the site address and the same `CRON_SECRET`. It calls `/api/reminders` every 15 minutes.

Never commit the secret keys.

## Tests

```bash
npm test          # unit tests (schedule, reminders, drafts, templates)
npm run typecheck # app + serverless functions
```

GitHub Actions runs the type checks, tests and build on every push (`.github/workflows/ci.yml`).

## Structure

- `src/pages/`: screens. Heavy ones (charts, admin, guide) load on first visit.
- `src/components/`: shared pieces (week chart, today card, rest timer, exercise guide, …).
- `src/lib/`: logic without UI: `db.ts` (Supabase or demo storage), `tableStore.ts` + `useTable.ts` (one shared copy of each table), `schedule.ts` (today's workout and the week plan), `reminders.ts` (who gets a reminder and what it says), `templates.ts`, `exerciseGuide.ts`.
- `api/`: Vercel functions: `reminders.ts` (called by pg_cron), `test-push.ts`. `api/_lib/reminders.js` is generated from `src/lib/reminders.ts` by `npm run build:api` (part of `npm run build`).
- `supabase/`: `setup.sql` (generated, new projects), the individual schema/update files, the reset-password email template.
- `public/sw.js`: service worker that shows notifications (no caching).
