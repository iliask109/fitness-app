import { supabase } from './supabase';
import { getLang, isEn, tr } from './i18n';
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

/** The build id in the URL makes each deploy install a fresh offline copy of the app. */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register(`/sw.js?v=${__BUILD_ID__}`).catch((e) => console.warn('service worker', e));
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
  if (!supabase) return Notification.permission === 'granted'; // demo mode has no real subscription
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

export type TestResult = { kind: 'sent'; devices: number } | { kind: 'no-devices' } | { kind: 'failed'; codes: number[] };

/** Sends a test reminder: through the server when online, or locally in demo mode. */
export async function sendTestNotification(): Promise<TestResult> {
  if (!supabase) {
    const reg = await registration();
    await reg.showNotification('FitLogix 🔔', { body: tr('ההתראות עובדות! (מצב הדגמה)', 'Notifications work! (demo mode)'), icon: '/icon-192.png', dir: isEn() ? 'ltr' : 'rtl', lang: getLang() });
    return { kind: 'sent', devices: 1 };
  }
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/test-push', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
  if (res.status === 404) return { kind: 'no-devices' };
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body.sent > 0 ? { kind: 'sent', devices: body.sent } : { kind: 'failed', codes: body.failed ?? [] };
}

const PROMPT_SNOOZE_KEY = 'fitlogix:notif-prompt-snoozed-until';
const SNOOZE_DAYS = 7;

/** "Not now" on the home-screen prompt hides it for a week. */
export function promptSnoozed() {
  try { return Number(localStorage.getItem(PROMPT_SNOOZE_KEY) || 0) > Date.now(); } catch { return false; }
}
export function snoozePrompt() {
  try { localStorage.setItem(PROMPT_SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000)); } catch { /* ignore */ }
}

/**
 * Re-registers this device when notifications are already allowed and the account has reminders on.
 * Runs on every app open, so after signing back in (or if the browser renewed its subscription)
 * reminders keep working without turning anything on again. Never shows a permission prompt.
 */
export async function syncDeviceSubscription(userId: string, remindersOn: boolean) {
  if (!remindersOn || !pushSupport().ok || Notification.permission !== 'granted') return;
  try { await enablePushOnDevice(userId); } catch (e) { console.warn('push sync', e); }
}
