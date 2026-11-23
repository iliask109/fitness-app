import { deleteRow, listRows, saveRow } from './db';
import type { BaseRow, TableName } from './types';

/**
 * One shared copy of each table per user. Every screen that uses a table reads the same rows,
 * so it is fetched once and a change made on one screen shows everywhere right away.
 * Data older than STALE_MS is refreshed when a screen mounts or the app comes back to the front.
 */
const STALE_MS = 30_000;

export interface Snapshot { rows: BaseRow[]; loading: boolean; error: string | null }
export interface Entry {
  userId: string;
  table: TableName;
  snap: Snapshot;
  loadedAt: number;
  inflight: Promise<void> | null;
  subs: Set<() => void>;
}

const store = new Map<string, Entry>();
export const errorListeners = new Set<() => void>();
const keyOf = (userId: string, table: TableName) => `${userId}:${table}`;

export function entryFor(userId: string, table: TableName): Entry {
  const key = keyOf(userId, table);
  let e = store.get(key);
  if (!e) {
    e = { userId, table, snap: { rows: [], loading: true, error: null }, loadedAt: 0, inflight: null, subs: new Set() };
    store.set(key, e);
  }
  return e;
}

export function set(e: Entry, patch: Partial<Snapshot>) {
  const hadError = !!e.snap.error;
  e.snap = { ...e.snap, ...patch };
  e.subs.forEach((f) => f());
  if (hadError !== !!e.snap.error) errorListeners.forEach((f) => f());
}

export function load(e: Entry): Promise<void> {
  if (e.inflight) return e.inflight;
  if (!e.loadedAt) set(e, { loading: true });
  e.inflight = listRows(e.userId, e.table)
    .then((rows) => { e.loadedAt = Date.now(); set(e, { rows, loading: false, error: null }); })
    .catch((err: Error) => set(e, { loading: false, error: err.message || 'load failed' }))
    .finally(() => { e.inflight = null; });
  return e.inflight;
}

export const isStale = (e: Entry) => !e.loadedAt || Date.now() - e.loadedAt > STALE_MS;

/** Re-fetch tables a screen is showing: stale ones, or (with `failedOnly`) the ones that failed. */
export function refreshTables(failedOnly = false) {
  for (const e of store.values()) {
    if (!e.subs.size) continue;
    if (failedOnly ? e.snap.error : isStale(e) || e.snap.error) load(e);
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshTables(); });
  window.addEventListener('online', () => refreshTables(true));
}

/** Tables that failed to load and are on screen (for the "no connection" banner). */
export function failedTables() {
  return [...store.values()].filter((e) => e.subs.size && e.snap.error).map((e) => e.table);
}
export function subscribeErrors(f: () => void) {
  errorListeners.add(f);
  return () => { errorListeners.delete(f); };
}

/** Save outside a component (e.g. right after onboarding) and keep the shared copy in sync. */
export async function saveToTable<T extends BaseRow>(userId: string, table: TableName, row: Partial<T>): Promise<T> {
  const saved = await saveRow<T>(userId, table, row);
  const e = store.get(keyOf(userId, table));
  if (e) {
    const i = e.snap.rows.findIndex((r) => r.id === saved.id);
    const rows = i < 0 ? [...e.snap.rows, saved] : e.snap.rows.map((r, j) => (j === i ? { ...r, ...saved } : r));
    set(e, { rows });
  }
  return saved;
}

/** Forget everything (on sign-out), so nothing of one user is shown to the next. */
export function clearTables() {
  store.clear();
  errorListeners.forEach((f) => f());
}
