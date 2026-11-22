import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  is_admin: boolean;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  birth_date: string | null;
  workouts: number;
  last_workout: string | null;
  last_weight: number | null;
}

/* ---------- demo mode: users are the ones who signed in on this browser ---------- */
const DEMO_USERS = 'fittrack:demo-users';
type DemoUser = { id: string; email: string; created_at: string; last_sign_in_at: string; banned?: boolean; is_admin?: boolean };

function demoUsers(): DemoUser[] {
  try { return JSON.parse(localStorage.getItem(DEMO_USERS) || '[]'); } catch { return []; }
}
function saveDemoUsers(list: DemoUser[]) { localStorage.setItem(DEMO_USERS, JSON.stringify(list)); }
function demoRows<T>(uid: string, table: string): T[] {
  try { return JSON.parse(localStorage.getItem(`fittrack:${uid}:${table}`) || '[]'); } catch { return []; }
}

/** Called on every demo sign-in. The first demo user becomes admin so the admin area can be tried out. */
export function recordDemoLogin(id: string, email: string) {
  const list = demoUsers();
  const now = new Date().toISOString();
  const u = list.find((x) => x.id === id);
  if (u) u.last_sign_in_at = now;
  else list.push({ id, email, created_at: now, last_sign_in_at: now, is_admin: list.length === 0 });
  saveDemoUsers(list);
  return list.find((x) => x.id === id)!;
}

/** "First Last", falling back to the display name or the email's user part. */
export function fullName(u: Pick<AdminUser, 'first_name' | 'last_name' | 'display_name' | 'email'>) {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.display_name || u.email.split('@')[0];
}

/* ---------- API ---------- */
/** Whether the signed-in user is an admin; `error` explains a failed check (shown in Settings). */
export async function checkIsAdmin(uid: string): Promise<{ admin: boolean; error?: string }> {
  if (!supabase) return { admin: !!demoUsers().find((u) => u.id === uid)?.is_admin };
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return { admin: false, error: error.message };
  return { admin: !!data };
}

export async function listUsers(): Promise<AdminUser[]> {
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) throw error;
    return (data ?? []).map((u: AdminUser) => ({
      ...u, workouts: Number(u.workouts), last_weight: u.last_weight == null ? null : Number(u.last_weight),
    }));
  }
  return demoUsers().map((u) => {
    const workouts = demoRows<{ date: string }>(u.id, 'workouts');
    const weights = demoRows<{ date: string; weight: number }>(u.id, 'body_weights').sort((a, b) => b.date.localeCompare(a.date));
    const profile = demoRows<{ display_name?: string; first_name?: string; last_name?: string; age?: number; birth_date?: string }>(u.id, 'profiles')[0];
    return {
      id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
      banned: !!u.banned, is_admin: !!u.is_admin, display_name: profile?.display_name ?? null,
      first_name: profile?.first_name ?? null, last_name: profile?.last_name ?? null,
      age: profile?.age ?? null, birth_date: profile?.birth_date ?? null,
      workouts: workouts.length,
      last_workout: workouts.map((w) => w.date).sort().at(-1) ?? null,
      last_weight: weights[0]?.weight ?? null,
    };
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { error } = await supabase!.rpc(name, args);
  if (error) throw new Error(translate(error.message));
}

export async function setBanned(target: string, ban: boolean) {
  if (supabase) return rpc('admin_set_banned', { target, ban });
  saveDemoUsers(demoUsers().map((u) => (u.id === target ? { ...u, banned: ban } : u)));
}

export async function setAdmin(target: string, make: boolean) {
  if (supabase) return rpc('admin_set_admin', { target, make });
  saveDemoUsers(demoUsers().map((u) => (u.id === target ? { ...u, is_admin: make } : u)));
}

export async function deleteUser(target: string) {
  if (supabase) return rpc('admin_delete_user', { target });
  saveDemoUsers(demoUsers().filter((u) => u.id !== target));
  for (const k of Object.keys(localStorage)) if (k.startsWith(`fittrack:${target}:`)) localStorage.removeItem(k);
}

export function isDemoBanned(id: string) {
  return !!demoUsers().find((u) => u.id === id)?.banned;
}

function translate(m: string) {
  if (/not authorized/.test(m)) return 'אין לך הרשאת מנהל';
  if (/yourself/.test(m)) return 'אי אפשר לבצע את הפעולה הזו על עצמך';
  return m;
}
