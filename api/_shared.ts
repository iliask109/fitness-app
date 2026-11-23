import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Public values (also shipped to the browser).
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://psjizccptbnbgsovnzys.supabase.co';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
  || 'BG6DOrK3UQgmMjaijZMY7dBWGnuY26E2_-2HepPoMnNVevhkH2SRqKkQ3B8xYriNgXDBwlOR2_9LU5c1Rqmdtg0';

/** Fails with a readable message when a secret is missing from the Vercel project settings. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name} (Vercel -> Settings -> Environment Variables)`);
  return v;
}

/** Server-side Supabase client with the secret key: bypasses RLS, so only use it here. */
export function adminClient() {
  return createClient(SUPABASE_URL, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails('mailto:no-reply@fitlogix.app', VAPID_PUBLIC_KEY, requireEnv('VAPID_PRIVATE_KEY'));
  vapidReady = true;
}

export interface SubscriptionRow { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

/** Sends to every device of a user; deletes subscriptions the browser has revoked. Returns how many arrived. */
export async function sendToSubscriptions(
  db: ReturnType<typeof adminClient>, subs: SubscriptionRow[], payload: { title: string; body: string; url: string },
): Promise<number> {
  ensureVapid();
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
      else console.error('push failed', code, (err as Error).message);
    }
  }
  return sent;
}
