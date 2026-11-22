import { useCallback, useEffect, useState } from 'react';
import { deleteRow, listRows, saveRow } from './db';
import { useAuth } from './auth';
import type { BaseRow, TableName } from './types';

/** Loads a table for the current user and exposes save/remove that keep local state in sync. */
export function useTable<T extends BaseRow>(table: TableName) {
  const { user } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setRows(await listRows<T>(user.id, table));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, table]);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (row: Partial<T>) => {
    if (!user) throw new Error('not signed in');
    const saved = await saveRow<T>(user.id, table, row);
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === saved.id);
      if (i < 0) return [...prev, saved];
      const next = [...prev];
      next[i] = { ...next[i], ...saved };
      return next;
    });
    return saved;
  }, [user, table]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    await deleteRow(user.id, table, id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, [user, table]);

  return { rows, loading, error, save, remove, reload };
}
