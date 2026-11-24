import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

/** One message in a user's thread with the admins. `user_id` is always the user whose thread it is. */
export interface Message { id: string; user_id: string; created_at: string; sender: 'user' | 'admin'; body: string; read_at?: string | null }

const demoKey = (uid: string) => `fittrack:${uid}:messages`;
function readDemo(uid: string): Message[] {
  try { return JSON.parse(localStorage.getItem(demoKey(uid)) || '[]'); } catch { return []; }
}
const writeDemo = (uid: string, list: Message[]) => localStorage.setItem(demoKey(uid), JSON.stringify(list));

function missingTable(m: string) {
  return /could not find the table|does not exist|schema cache/i.test(m)
    ? 'מסד הנתונים עוד לא עודכן (update-14-meal-plan-and-messages.sql). / The database has not been updated yet (update-14).' : m;
}

export async function listThread(uid: string): Promise<Message[]> {
  if (!supabase) return readDemo(uid);
  const { data, error } = await supabase.from('messages').select('*').eq('user_id', uid).order('created_at');
  if (error) throw new Error(missingTable(error.message));
  return data as Message[];
}

/** Admins only (RLS): every message, oldest first. */
export async function listAllMessages(): Promise<Message[]> {
  if (!supabase) {
    return Object.keys(localStorage).filter((k) => /^fittrack:.+:messages$/.test(k))
      .flatMap((k) => readDemo(k.slice('fittrack:'.length, -':messages'.length)))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  const { data, error } = await supabase.from('messages').select('*').order('created_at');
  if (error) throw new Error(missingTable(error.message));
  return data as Message[];
}

export async function sendMessage(uid: string, sender: Message['sender'], body: string): Promise<Message> {
  const text = body.trim().slice(0, 4000);
  if (!supabase) {
    const m: Message = { id: crypto.randomUUID(), user_id: uid, created_at: new Date().toISOString(), sender, body: text, read_at: null };
    writeDemo(uid, [...readDemo(uid), m]);
    return m;
  }
  const { data, error } = await supabase.from('messages').insert({ user_id: uid, sender, body: text }).select().single();
  if (error) throw new Error(missingTable(error.message));
  return data as Message;
}

/** Fired after messages are marked read or sent, so unread badges elsewhere refresh at once. */
export const MESSAGES_CHANGED = 'fitlogix:messages-changed';
const changed = () => window.dispatchEvent(new Event(MESSAGES_CHANGED));

/** Marks the other side's messages in a thread as read. */
export async function markRead(uid: string, from: Message['sender']) {
  const now = new Date().toISOString();
  if (!supabase) writeDemo(uid, readDemo(uid).map((m) => (m.sender === from && !m.read_at ? { ...m, read_at: now } : m)));
  else await supabase.from('messages').update({ read_at: now }).eq('user_id', uid).eq('sender', from).is('read_at', null);
  changed();
}

export const unread = (list: Message[], from: Message['sender']) => list.filter((m) => m.sender === from && !m.read_at).length;

/** A thread, refreshed every `everyMs` while the component is shown. */
export function useThread(uid: string | undefined, everyMs = 15000) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    if (!uid || !navigator.onLine) return;
    try { setMessages(await listThread(uid)); setError(null); } catch (e) { setError((e as Error).message); } finally { setLoaded(true); }
  }, [uid]);
  useEffect(() => {
    reload();
    const t = setInterval(reload, everyMs);
    window.addEventListener(MESSAGES_CHANGED, reload);
    return () => { clearInterval(t); window.removeEventListener(MESSAGES_CHANGED, reload); };
  }, [reload, everyMs]);
  return { messages, setMessages, error, loaded, reload };
}
