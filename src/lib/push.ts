import { supabase } from './supabase';
import { deleteRow, saveRow } from './db';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushSupport =
  | { ok: true }
  | { ok: false; reason: 'ios-install' | 'unsupported' | 'blocked' };

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** Whether this browser can get push notifications now, and if not, why. */
export function pushSupport(): PushSupport {
  if (isIOS() && !isInstalled()) return { ok: false, reason: 'ios-install' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return { ok: false, reason: 'unsupported' };
  if (Notification.permission === 'denied') return { ok: false, reason: 'blocked' };
  return { ok: true };
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('service worker', e));
}

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Stable row id for a device: one row per browser endpoint. */
async function idFor(endpoint: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

async function registration() {
  registerServiceWorker();
  return navigator.serviceWorker.ready;
}

/** True when this device is already subscribed. */
export async function deviceSubscribed() {
  if (!pushSupport().ok) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

/** Asks permission and registers this device for the user's reminders. */
export async function enablePushOnDevice(userId: string) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'blocked' : 'dismissed');
  const reg = await registration();
  if (!supabase || !VAPID_PUBLIC_KEY) return; // demo mode: local notifications only
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  await saveRow(userId, 'push_subscriptions', { id: await idFor(sub.endpoint), endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth } as never);
}

/** Stops reminders on this device (also used on sign-out, so the next person doesn't get them). */
export async function disablePushOnDevice(userId: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    if (supabase) await deleteRow(userId, 'push_subscriptions', await idFor(sub.endpoint)).catch(() => {});
    await sub.unsubscribe();
  } catch { /* nothing to undo */ }
}

/** Sends a test reminder: through the server when online, or locally in demo mode. */
export async function sendTestNotification(): Promise<'sent' | 'no-devices'> {
  if (!supabase) {
    const reg = await registration();
    await reg.showNotification('FitLogix 🔔', { body: 'ההתראות עובדות! (מצב הדגמה)', icon: '/icon-192.png', dir: 'rtl', lang: 'he' });
    return 'sent';
  }
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/test-push', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
  if (res.status === 404) return 'no-devices';
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return 'sent';
}
