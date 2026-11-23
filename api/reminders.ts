import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminClient, requireEnv, sendToSubscriptions, SubscriptionRow } from './_shared.js';
import { decideReminder, HISTORY_DAYS, isDue, localNow } from './_lib/reminders.js';

/** Users handled at the same time, to stay well inside the function's time limit. */
const PARALLEL = 5;

/**
 * Called every 15 minutes by Supabase (pg_cron). Sends each user at most one reminder a day,
 * at the time they chose: today's planned workout, or "no workout this week yet".
 * Only users whose time falls in this 15-minute slot get their data loaded.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.headers.authorization !== `Bearer ${requireEnv('CRON_SECRET')}`) return res.status(401).json({ error: 'unauthorized' });
    const db = adminClient();
    const now = new Date();

    const { data: profiles, error } = await db.from('profiles')
      .select('id,user_id,reminder_enabled,reminder_time,reminder_tz,remind_training_day,remind_no_workout,last_reminded_on,active_program_id')
      .eq('reminder_enabled', true);
    if (error) throw error;
    type Row = { id: string; user_id: string; reminder_tz?: string | null } & Record<string, unknown>;
    const due = ((profiles ?? []) as Row[]).filter((p) => isDue(p, now));

    const since = new Date(now.getTime() - HISTORY_DAYS * 86400000).toISOString().slice(0, 10);
    const results: { user: string; kind?: string; sent?: number }[] = [];

    async function handle(profile: Row) {
      const uid = profile.user_id;
      const [w, p] = await Promise.all([
        db.from('workouts').select('id,date,name,exercises,program_id,program_day,created_at').eq('user_id', uid).gte('date', since),
        db.from('programs').select('*').eq('user_id', uid).order('created_at'),
      ]);
      if (w.error) throw w.error;
      if (p.error) throw p.error;
      const msg = decideReminder(profile, w.data ?? [], p.data ?? [], now);
      if (!msg) return;
      const { data: subs, error: subsError } = await db.from('push_subscriptions').select('*').eq('user_id', uid);
      if (subsError) throw subsError;
      const sent = subs?.length ? (await sendToSubscriptions(db, subs as SubscriptionRow[], msg)).sent : 0;
      // Mark the day as handled even with no devices, so the user is not processed again today.
      await db.from('profiles').update({ last_reminded_on: localNow(now, profile.reminder_tz || 'Asia/Jerusalem').date }).eq('id', profile.id);
      results.push({ user: uid.slice(0, 8), kind: msg.kind, sent });
    }

    for (let i = 0; i < due.length; i += PARALLEL) {
      await Promise.all(due.slice(i, i + PARALLEL).map((p) => handle(p).catch((e) => console.error('reminder failed', p.user_id.slice(0, 8), e))));
    }
    return res.status(200).json({ enabled: profiles?.length ?? 0, due: due.length, reminded: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
