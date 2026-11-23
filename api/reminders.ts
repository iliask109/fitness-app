import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminClient, requireEnv, sendToSubscriptions, SubscriptionRow } from './_shared.js';
import { decideReminder, localNow } from './_lib/reminders.js';

/**
 * Called every 15 minutes by Supabase (pg_cron). Sends each user at most one reminder a day,
 * at the time they chose: today's planned workout, or "no workout this week yet".
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.headers.authorization !== `Bearer ${requireEnv('CRON_SECRET')}`) return res.status(401).json({ error: 'unauthorized' });
    const db = adminClient();
    const now = new Date();

    const { data: profiles, error } = await db.from('profiles').select('*').eq('reminder_enabled', true);
    if (error) throw error;

    const results: { user: string; kind?: string; sent?: number }[] = [];
    for (const profile of (profiles ?? []) as ({ id: string; user_id: string; reminder_tz?: string | null } & Record<string, unknown>)[]) {
      const uid = profile.user_id;
      const [{ data: workouts }, { data: programs }] = await Promise.all([
        db.from('workouts').select('id,date,name,exercises,program_id,program_day,created_at').eq('user_id', uid),
        db.from('programs').select('*').eq('user_id', uid).order('created_at'),
      ]);
      const msg = decideReminder(profile, workouts ?? [], programs ?? [], now);
      if (!msg) continue;

      const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', uid);
      const sent = subs?.length ? (await sendToSubscriptions(db, subs as SubscriptionRow[], msg)).sent : 0;
      // Mark the day as handled even with no devices, so a user isn't re-checked every 15 minutes.
      await db.from('profiles').update({ last_reminded_on: localNow(now, profile.reminder_tz || 'Asia/Jerusalem').date }).eq('id', profile.id);
      results.push({ user: uid.slice(0, 8), kind: msg.kind, sent });
    }
    return res.status(200).json({ checked: profiles?.length ?? 0, reminded: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
