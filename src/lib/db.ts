import { supabase } from './supabase';
import type { BaseRow, TableName } from './types';

/**
 * One small data API used by every screen. In cloud mode it talks to Supabase
 * (RLS limits rows to the signed-in user); in demo mode it uses localStorage.
 */
const localKey = (userId: string, table: TableName) => `fittrack:${userId}:${table}`;

function readLocal<T>(userId: string, table: TableName): T[] {
  try {
    return JSON.parse(localStorage.getItem(localKey(userId, table)) || '[]');
  } catch {
    return [];
  }
}
function writeLocal<T>(userId: string, table: TableName, rows: T[]) {
  localStorage.setItem(localKey(userId, table), JSON.stringify(rows));
}

export async function listRows<T extends BaseRow>(userId: string, table: TableName): Promise<T[]> {
  if (supabase) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(normalize) as T[];
  }
  return readLocal<T>(userId, table);
}

export async function saveRow<T extends BaseRow>(userId: string, table: TableName, row: Partial<T>): Promise<T> {
  const full = { ...row, id: row.id ?? crypto.randomUUID(), user_id: userId } as T;
  if (supabase) {
    const payload = { ...full } as unknown as Record<string, unknown>;
    // If a column from a newer update isn't in the database yet, save without it instead of failing.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase.from(table).upsert(payload).select().single();
      if (!error) return normalize(data) as T;
      const missing = /Could not find the '(\w+)' column/.exec(error.message)?.[1];
      if (!missing || !(missing in payload)) throw error;
      console.warn(`Column ${table}.${missing} is missing; run the latest supabase/update-*.sql. Saved without it.`);
      delete payload[missing];
    }
    throw new Error('save failed');
  }
  const rows = readLocal<T>(userId, table);
  const i = rows.findIndex((r) => r.id === full.id);
  if (i >= 0) rows[i] = { ...rows[i], ...full };
  else rows.push({ ...full, created_at: new Date().toISOString() });
  writeLocal(userId, table, rows);
  return full;
}

export async function deleteRow(userId: string, table: TableName, id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocal(userId, table, readLocal<BaseRow>(userId, table).filter((r) => r.id !== id));
}

/** Postgres `numeric` comes back as a string; turn numeric-looking fields back into numbers. */
const NUMERIC = ['protein', 'carbs', 'fat', 'weight', 'weight_goal'];
function normalize(row: Record<string, unknown>) {
  for (const k of NUMERIC) if (typeof row[k] === 'string') row[k] = Number(row[k]);
  return row;
}
