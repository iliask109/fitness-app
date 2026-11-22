# FitLogix 💪

A fitness web app in Hebrew (right-to-left): workout tracking, training programs, nutrition and progress.

## Features
- **Workout tracking**: sets, reps and weights, a rest timer, and your last session's numbers shown for each exercise
- **Training programs**: build your own, or start from a ready-made one (full body, Push/Pull/Legs, upper/lower)
- **Nutrition**: meals by time of day, calories and macros against goals, quick-add foods, water tracking
- **Progress**: body weight chart, workouts per week, daily calories, estimated 1RM per exercise, and personal records
- **Users and cloud**: sign-up and sign-in with Supabase; each user sees only their own data (RLS)

## Run locally
```bash
npm install
npm run dev
```
Without Supabase keys the app runs in **demo mode**, and data is saved only in the browser.

## Connect to the cloud (Supabase, free tier)
1. Create a project at https://supabase.com
2. **SQL Editor → New query**: paste the contents of `supabase/schema.sql` and run it.
3. **Project Settings → API**: copy the Project URL and the `anon` key.
4. Copy `.env.example` to `.env.local` and fill in both values.
5. Restart `npm run dev`.

Optional: under **Authentication → Providers → Email**, turn off "Confirm email" if you don't want email confirmation at sign-up.

## Deploy
`npm run build` builds into `dist/`. You can deploy it to Vercel or Netlify. Set the two `VITE_SUPABASE_*` variables in the hosting settings.
On a phone, "Add to Home Screen" installs it as an app.

## Structure
- `src/lib/db.ts`: the data layer (Supabase, or localStorage in demo mode)
- `src/pages/`: the screens
- `supabase/schema.sql`: tables and security policies
