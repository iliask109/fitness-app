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

/** Role inside a legacy JWT key ("anon" or "service_role"), if it is one. */
function jwtRole(key: string): string | undefined {
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { return undefined; }
}

/** Server-side Supabase client with the secret key: bypasses RLS, so only use it here. */
export function adminClient() {
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY').trim();
  // The public key would sign users in fine but read nothing, which looks like "no devices". Say so instead.
  if (key.startsWith('sb_publishable_') || jwtRole(key) === 'anon') {
    throw new Error('ב-Vercel, SUPABASE_SERVICE_ROLE_KEY מכיל את המפתח הציבורי. צריך את המפתח הסודי מ-Supabase (secret, מתחיל ב-sb_secret_ או service_role).');
  }
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails('mailto:no-reply@fitlogix.app', VAPID_PUBLIC_KEY, requireEnv('VAPID_PRIVATE_KEY'));
  vapidReady = true;
}

export interface SubscriptionRow { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

/**
 * Push addresses come from the browser, but users could save any URL there. Only the browsers' real push
 * services are contacted, so the server is never made to call an arbitrary address.
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.notify\.windows\.com$/, /^android\.googleapis\.com$/];
export function isPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch { return false; }
}

/**
 * Sends to every device of a user; deletes subscriptions the browser has revoked (404/410).
 * Returns how many arrived and the status code of each failure.
 */
export async function sendToSubscriptions(
  db: ReturnType<typeof adminClient>, subs: SubscriptionRow[], payload: { title: string; body: string; url: string; lang?: string; dir?: string },
): Promise<{ sent: number; failed: number[] }> {
  ensureVapid();
  let sent = 0;
  const failed: number[] = [];
  for (const s of subs) {
    if (!isPushEndpoint(s.endpoint)) { failed.push(0); console.error('skipped push to unknown host'); continue; }
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode ?? 0;
      failed.push(code);
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
      else console.error('push failed', code, (err as Error).message, (err as { body?: string }).body);
    }
  }
  return { sent, failed };
}
