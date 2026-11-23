import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { deleteRow } from './db';
import { useAuth } from './auth';
import type { BaseRow, TableName } from './types';
import { entryFor, errorListeners, isStale, load, saveToTable, set, Snapshot } from './tableStore';

export { refreshTables, saveToTable, clearTables } from './tableStore';

const EMPTY: Snapshot = { rows: [], loading: true, error: null };

/** Rows of one table for the signed-in user, with save/remove that update every screen at once. */
export function useTable<T extends BaseRow>(table: TableName) {
  const { user } = useAuth();
  const e = user ? entryFor(user.id, table) : null;

  const snap = useSyncExternalStore(
    useCallback((f: () => void) => {
      if (!e) return () => {};
      e.subs.add(f);
      return () => { e.subs.delete(f); errorListeners.forEach((g) => g()); };
    }, [e]),
    () => (e ? e.snap : EMPTY),
  );

  useEffect(() => { if (e && (isStale(e) || e.snap.error)) load(e); }, [e]);

  const reload = useCallback(async () => { if (e) { e.loadedAt = 0; await load(e); } }, [e]);

  const save = useCallback(async (row: Partial<T>) => {
    if (!user) throw new Error('not signed in');
    return saveToTable<T>(user.id, table, row);
  }, [user, table]);

  const remove = useCallback(async (id: string) => {
    if (!user || !e) return;
    await deleteRow(user.id, table, id);
    set(e, { rows: e.snap.rows.filter((r) => r.id !== id) });
  }, [user, table, e]);

  return { rows: snap.rows as T[], loading: snap.loading, error: snap.error, save, remove, reload };
}
