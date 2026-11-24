import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { AdminUser, fullName, listUsers } from '../lib/admin';
import { listAllMessages, Message } from '../lib/messages';
import { daysAgo } from '../lib/utils';
import MessageThread from '../components/MessageThread';

/** Admin inbox: one row per user who wrote (newest first, unread on top), and the conversation with one user. */
export default function AdminMessages({ uid }: { uid?: string }) {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    const load = () => Promise.all([listUsers(), listAllMessages()])
      .then(([u, m]) => { if (alive) { setUsers(u); setMessages(m); setError(null); } })
      .catch((e) => { if (alive) setError((e as Error).message); });
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [isAdmin, uid]);

  if (!isAdmin) return <div className="card muted">אין לך הרשאת מנהל.</div>;
  const nameOf = (id: string) => { const u = users.find((x) => x.id === id); return u ? fullName(u) : 'משתמש שנמחק'; };

  if (uid) {
    const u = users.find((x) => x.id === uid);
    return (
      <div className="stack">
        <a href="#/admin-messages" className="muted">→ חזרה להודעות</a>
        <div className="row between">
          <h2 style={{ margin: 0 }}>💬 {nameOf(uid)}</h2>
          {u && <a className="btn small" href={`#/admin/${uid}`}>👤 פרופיל</a>}
        </div>
        {u && <span className="muted small" dir="ltr" style={{ textAlign: 'right' }}>{u.email}</span>}
        <div className="card"><MessageThread uid={uid} as="admin" otherName={nameOf(uid)} /></div>
      </div>
    );
  }

  const threads = Object.values((messages ?? []).reduce<Record<string, Message[]>>((a, m) => { (a[m.user_id] ??= []).push(m); return a; }, {}))
    .map((list) => ({ uid: list[0].user_id, last: list[list.length - 1], unread: list.filter((m) => m.sender === 'user' && !m.read_at).length }))
    .sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0) || b.last.created_at.localeCompare(a.last.created_at));

  return (
    <div className="stack">
      <h2>💬 הודעות ממשתמשים</h2>
      {error && <p className="notice">{error}</p>}
      {messages === null && !error && <p className="muted">טוען…</p>}
      {messages && threads.length === 0 && <div className="card muted">עוד לא התקבלו הודעות. משתמשים יכולים לכתוב לך מההגדרות שלהם ("פנייה למנהל").</div>}
      {threads.map((t) => (
        <a key={t.uid} href={`#/admin-messages/${t.uid}`} className={'card list-card' + (t.unread ? ' unread-thread' : '')}>
          <div className="row between">
            <strong>{nameOf(t.uid)}</strong>
            <span className="row gap">
              {t.unread > 0 && <span className="unread-dot">{t.unread}</span>}
              <span className="muted small">{daysAgo(t.last.created_at)}</span>
            </span>
          </div>
          <div className="muted small thread-preview">{t.last.sender === 'admin' ? 'אני: ' : ''}{t.last.body}</div>
        </a>
      ))}
    </div>
  );
}
