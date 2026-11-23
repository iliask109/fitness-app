import { deleteRow, listRows, saveRow } from './db';
import { supabase } from './supabase';
import type { BaseRow, TableName } from './types';

/**
 * One shared copy of each table per user. Every screen that uses a table reads the same rows,
 * so it is fetched once and a change made on one screen shows everywhere right away.
 *
 * Offline: the last loaded rows are kept on the device and shown when the server can't be reached,
 * and saves/deletes made offline wait in an outbox that is sent when the connection returns.
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

// ---------- device copy (only with a server; demo mode already lives on the device) ----------
const cacheKey = (userId: string, table: TableName) => `fitlogix:cache:${userId}:${table}`;
function readCache(userId: string, table: TableName): BaseRow[] | null {
  if (!supabase) return null;
  try { const raw = localStorage.getItem(cacheKey(userId, table)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeCache(e: Entry) {
  if (!supabase) return;
  try { localStorage.setItem(cacheKey(e.userId, e.table), JSON.stringify(e.snap.rows)); } catch { /* storage full: still works online */ }
}

// ---------- outbox ----------
type OutboxItem = { op: 'save'; table: TableName; row: BaseRow } | { op: 'delete'; table: TableName; id: string };
const outboxKey = (userId: string) => `fitlogix:outbox:${userId}`;
function readOutbox(userId: string): OutboxItem[] {
  try { return JSON.parse(localStorage.getItem(outboxKey(userId)) || '[]'); } catch { return []; }
}
function writeOutbox(userId: string, items: OutboxItem[]) {
  try {
    if (items.length) localStorage.setItem(outboxKey(userId), JSON.stringify(items));
    else localStorage.removeItem(outboxKey(userId));
  } catch { /* ignore */ }
  outboxListeners.forEach((f) => f());
}
const outboxListeners = new Set<() => void>();

/** A failure caused by having no connection (as opposed to the server refusing the data). */
export const isNetworkError = (err: unknown) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false)
  || /failed to fetch|networkerror|load failed|fetch failed|network request failed|err_internet/i.test(String((err as Error)?.message ?? err));

/** Applies unsent changes on top of rows from the server, so they don't vanish before they are sent. */
function withPending(userId: string, table: TableName, rows: BaseRow[]) {
  let out = rows;
  for (const it of readOutbox(userId)) {
    if (it.table !== table) continue;
    if (it.op === 'delete') out = out.filter((r) => r.id !== it.id);
    else {
      const i = out.findIndex((r) => r.id === it.row.id);
      out = i < 0 ? [...out, it.row] : out.map((r, j) => (j === i ? { ...r, ...it.row } : r));
    }
  }
  return out;
}

// ---------- entries ----------
export function entryFor(userId: string, table: TableName): Entry {
  const key = keyOf(userId, table);
  let e = store.get(key);
  if (!e) {
    // Start from the device copy (if any), so screens show something at once and offline.
    const cached = readCache(userId, table);
    e = { userId, table, snap: { rows: cached ? withPending(userId, table, cached) : [], loading: !cached, error: null },
      loadedAt: 0, inflight: null, subs: new Set() };
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
  if (!e.loadedAt && !e.snap.rows.length) set(e, { loading: true });
  e.inflight = listRows(e.userId, e.table)
    .then((rows) => {
      e.loadedAt = Date.now();
      set(e, { rows: withPending(e.userId, e.table, rows), loading: false, error: null });
      if (supabase) try { localStorage.setItem(cacheKey(e.userId, e.table), JSON.stringify(rows)); } catch { /* ignore */ }
    })
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

/** Tables that failed to load and are on screen (for the "no connection" banner). */
export function failedTables() {
  return [...store.values()].filter((e) => e.subs.size && e.snap.error).map((e) => e.table);
}
export function subscribeErrors(f: () => void) {
  errorListeners.add(f);
  return () => { errorListeners.delete(f); };
}

function applyLocal(userId: string, table: TableName, fn: (rows: BaseRow[]) => BaseRow[]) {
  const e = store.get(keyOf(userId, table));
  if (!e) return;
  set(e, { rows: fn(e.snap.rows) });
  writeCache(e);
}

/**
 * Save and keep every screen in sync. Without a connection the row is kept on the device,
 * shown as usual, and sent later; the caller gets it back as if it was saved.
 */
export async function saveToTable<T extends BaseRow>(userId: string, table: TableName, row: Partial<T>): Promise<T> {
  const full = { ...row, id: row.id ?? crypto.randomUUID(), user_id: userId } as T;
  let saved: T;
  try {
    saved = await saveRow<T>(userId, table, full);
  } catch (err) {
    if (!supabase || !isNetworkError(err)) throw err;
    writeOutbox(userId, [...readOutbox(userId).filter((it) => !(it.op === 'save' && it.row.id === full.id)), { op: 'save', table, row: full }]);
    saved = full;
  }
  applyLocal(userId, table, (rows) => {
    const i = rows.findIndex((r) => r.id === saved.id);
    return i < 0 ? [...rows, saved] : rows.map((r, j) => (j === i ? { ...r, ...saved } : r));
  });
  return saved;
}

/** Delete, or queue the delete when offline. */
export async function removeFromTable(userId: string, table: TableName, id: string) {
  try {
    await deleteRow(userId, table, id);
  } catch (err) {
    if (!supabase || !isNetworkError(err)) throw err;
    // A row that was never sent only needs to leave the outbox.
    const items = readOutbox(userId);
    const unsent = items.some((it) => it.op === 'save' && it.row.id === id);
    writeOutbox(userId, unsent ? items.filter((it) => !(it.op === 'save' && it.row.id === id)) : [...items, { op: 'delete', table, id }]);
  }
  applyLocal(userId, table, (rows) => rows.filter((r) => r.id !== id));
}

// ---------- sending the outbox ----------
let flushing: Promise<void> | null = null;

/** Sends queued changes in order; stops at the first network failure and tries again later. */
export function flushOutbox(userId: string): Promise<void> {
  if (!supabase || flushing) return flushing ?? Promise.resolve();
  flushing = (async () => {
    let items = readOutbox(userId);
    while (items.length) {
      const it = items[0];
      try {
        if (it.op === 'save') await saveRow(userId, it.table, it.row);
        else await deleteRow(userId, it.table, it.id);
      } catch (err) {
        if (isNetworkError(err)) break;
        console.error('sync dropped a change the server refused', it, err); // don't block the rest forever
      }
      items = items.slice(1);
      writeOutbox(userId, items);
    }
  })().finally(() => { flushing = null; refreshTables(true); });
  return flushing;
}

/** Unsent changes for the signed-in user (for the banner and the "waiting to sync" marks). */
export function pendingIds(userId: string): Set<string> {
  return new Set(readOutbox(userId).map((it) => (it.op === 'save' ? it.row.id : it.id)));
}
export function pendingCount(userId: string) { return readOutbox(userId).length; }
export function subscribeOutbox(f: () => void) {
  outboxListeners.add(f);
  return () => { outboxListeners.delete(f); };
}

let syncUser: string | null = null;
/** Starts sending the outbox for this user now, when the connection returns, and every minute. */
export function startSync(userId: string) {
  syncUser = userId;
  flushOutbox(userId);
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (syncUser) flushOutbox(syncUser);
    refreshTables();
  });
  window.addEventListener('online', () => { if (syncUser) flushOutbox(syncUser); else refreshTables(true); });
  setInterval(() => { if (syncUser && navigator.onLine && pendingCount(syncUser)) flushOutbox(syncUser); }, 60_000);
}

/** Forget what is in memory and the device copies (on sign-out). Unsent changes are kept for that user. */
export function clearTables() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('fitlogix:cache:')) localStorage.removeItem(k);
  } catch { /* ignore */ }
  store.clear();
  syncUser = null;
  errorListeners.forEach((f) => f());
}
