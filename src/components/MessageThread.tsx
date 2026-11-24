import { FormEvent, useEffect, useRef, useState } from 'react';
import { markRead, sendMessage, useThread } from '../lib/messages';
import { locale, tr } from '../lib/i18n';

/**
 * The chat between one user and the admins. `as` says who is looking: the user (in Settings)
 * or an admin (in the admin area). Opening it marks the other side's messages as read.
 */
export default function MessageThread({ uid, as, otherName }: { uid: string; as: 'user' | 'admin'; otherName?: string }) {
  const { messages, setMessages, error, loaded, reload } = useThread(uid);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const other = as === 'user' ? 'admin' : 'user';

  const unreadFromOther = messages.some((m) => m.sender === other && !m.read_at);
  useEffect(() => { if (unreadFromOther) markRead(uid, other).then(reload).catch(() => undefined); }, [unreadFromOther, uid, other, reload]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setSendError(null);
    try {
      const m = await sendMessage(uid, as, text);
      setMessages((list) => [...list, m]);
      setText('');
    } catch (err) {
      setSendError(tr('השליחה נכשלה: ', 'Sending failed: ') + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const time = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="stack tight">
      {error && <p className="notice" style={{ margin: 0 }}>{error}</p>}
      {loaded && messages.length === 0 && !error && (
        <p className="muted small" style={{ margin: 0 }}>
          {as === 'user'
            ? tr('אפשר לכתוב למנהל כל שאלה או בקשה, למשל על התפריט או על התוכנית. התשובה תופיע כאן.', 'You can write the admin any question or request, for example about your menu or program. The reply will appear here.')
            : 'עוד אין הודעות בשיחה הזו.'}
        </p>
      )}
      {messages.length > 0 && (
        <div className="chat-log">
          {messages.map((m) => (
            <div key={m.id} className={'chat-msg ' + (m.sender === as ? 'mine' : 'theirs')}>
              <span className="chat-who muted">{m.sender === as ? tr('אני', 'Me') : as === 'user' ? tr('המנהל', 'Admin') : otherName ?? 'המשתמש'} · {time(m.created_at)}</span>
              {m.body}
            </div>
          ))}
          <div ref={end} />
        </div>
      )}
      <form onSubmit={submit} className="stack tight">
        <textarea rows={2} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)}
          placeholder={as === 'user' ? tr('ההודעה שלך למנהל…', 'Your message to the admin…') : 'התשובה שלך…'} aria-label={tr('הודעה', 'Message')} />
        <button className="btn primary" disabled={busy || !text.trim()}>{busy ? tr('שולח…', 'Sending…') : tr('שליחה', 'Send')}</button>
      </form>
      {sendError && <p className="notice" style={{ margin: 0 }}>{sendError}</p>}
    </div>
  );
}
