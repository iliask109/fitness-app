import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { tr } from '../lib/i18n';
import { todayISO } from '../lib/utils';

interface Msg { role: 'user' | 'assistant'; content: string }

const KEY = (uid: string) => `fitlogix:coach:${uid}`;
const SUGGESTIONS = () => [
  tr('מה כדאי לי לאכול עכשיו כדי להשלים חלבון?', 'What should I eat now to hit my protein?'),
  tr('מה לאכול לפני אימון?', 'What should I eat before a workout?'),
  tr('איך לשפר את הסקוואט שלי?', 'How can I improve my squat?'),
  tr('כמה מנוחה צריך בין אימונים?', 'How much rest do I need between workouts?'),
];

/**
 * "Ask the coach": questions about training and nutrition, answered by Claude on the server (api/coach.ts).
 * It only answers; it has no way to change meals, goals or workouts. The conversation stays on this device.
 */
export default function CoachChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY(user!.id)) || '[]'); } catch { return []; }
  });
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY(user!.id), JSON.stringify(msgs.slice(-30))); } catch { /* storage full */ }
  }, [msgs, user]);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: 'nearest' }); }, [msgs, open]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    if (!supabase) { setError(tr('בגרסת ההדגמה אין מאמן AI. באתר האמיתי הוא עונה כאן.', 'The AI coach is not available in demo mode. On the real site it answers here.')); return; }
    if (!navigator.onLine) { setError(tr('אין חיבור לאינטרנט.', 'No internet connection.')); return; }
    const history: Msg[] = [...msgs, { role: 'user', content: question }];
    setMsgs([...history, { role: 'assistant', content: '' }]);
    setQ('');
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({ messages: history, today: todayISO() }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMsgs([...history, { role: 'assistant', content: answer }]);
      }
    } catch (e) {
      setMsgs(history.slice(0, -1));
      setQ(question);
      setError(tr('המאמן לא זמין כרגע: ', 'The coach is not available right now: ') + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => { e.preventDefault(); ask(q); };

  return (
    <div className="card stack tight coach">
      <button type="button" className="collapse-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <h3>🤖 {tr('שאל את המאמן', 'Ask the coach')}</h3>
        <span className="collapse-arrow" aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <>
          <p className="muted small" style={{ margin: 0 }}>
            {tr('שאלות על אימונים ותזונה. המאמן רואה את היעדים, הארוחות והאימונים שלך, אבל לא משנה שום דבר.', 'Questions about training and nutrition. The coach sees your goals, meals and workouts, but never changes anything.')}
          </p>
          {msgs.length === 0 ? (
            <div className="chips">
              {SUGGESTIONS().map((s) => <button key={s} type="button" className="chip btn-chip" onClick={() => ask(s)}>{s}</button>)}
            </div>
          ) : (
            <div className="coach-log">
              {msgs.map((m, i) => (
                <div key={i} className={'coach-msg ' + m.role}>
                  {m.content || (busy && i === msgs.length - 1 ? <span className="muted">{tr('חושב…', 'Thinking…')}</span> : null)}
                </div>
              ))}
              <div ref={end} />
            </div>
          )}
          {error && <p className="notice" style={{ margin: 0 }}>{error}</p>}
          <form onSubmit={submit} className="row gap">
            <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} disabled={busy}
              placeholder={tr('שאלה על אימון או תזונה…', 'A question about training or nutrition…')} aria-label={tr('שאלה למאמן', 'Question for the coach')} />
            <button className="btn primary" disabled={busy || !q.trim()}>{busy ? '…' : tr('שליחה', 'Send')}</button>
          </form>
          <div className="row between">
            <span className="muted small">{tr('תשובות כלליות, לא ייעוץ רפואי.', 'General answers, not medical advice.')}</span>
            {msgs.length > 0 && !busy && <button type="button" className="link-btn small" onClick={() => setMsgs([])}>{tr('ניקוי השיחה', 'Clear chat')}</button>}
          </div>
        </>
      )}
    </div>
  );
}
