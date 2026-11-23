import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminClient, sendToSubscriptions, SubscriptionRow } from './_shared.js';

/** "Send a test notification" from Settings: sends to the signed-in user's own devices only. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    const db = adminClient();
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'not signed in' });

    const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', user.id);
    if (!subs?.length) return res.status(404).json({ error: 'no devices' });
    const result = await sendToSubscriptions(db, subs as SubscriptionRow[], {
      title: 'FitLogix 🔔', body: 'ההתראות עובדות! נזכיר לך כשיגיע זמן האימון.', url: '/#/settings',
    });
    return res.status(200).json({ devices: subs.length, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
