import { useEffect, useState } from 'react';
import { useTemplates } from '../lib/templateStore';
import { ProgramTemplate, TEMPLATE_CATEGORIES } from '../lib/templates';
import { navigate } from '../lib/router';
import ExercisePicker from '../components/ExercisePicker';

const LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
/** Sensible default training days for a given number of days per week. */
const DEFAULT_DAYS: Record<number, number[]> = {
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};

/** Admin: create or edit one ready-made program. */
export default function AdminTemplateEditor({ id }: { id: string }) {
  const store = useTemplates();
  const [t, setT] = useState<ProgramTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const isNew = id === 'new';

  useEffect(() => {
    if (t || store.loading) return;
    if (isNew) {
      setT({ name: '', description: '', category: 'gym', equipment: '', schedule: { kind: 'weekly', weekdays: DEFAULT_DAYS[3], required: 3 },
        days: [{ name: 'אימון A', exercises: [] }] });
      return;
    }
    const found = store.list.find((x) => x.id === id);
    if (found) setT(structuredClone(found)); else navigate('/admin-programs');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.loading]);

  if (!t) return <p className="muted">טוען…</p>;
  const update = (fn: (d: ProgramTemplate) => void) => { setError(null); setT((prev) => { const d = structuredClone(prev!); fn(d); return d; }); };
  const weekly = t.schedule.kind === 'weekly' ? t.schedule : { kind: 'weekly' as const, weekdays: DEFAULT_DAYS[3], required: 3 };
  const perWeek = weekly.required ?? weekly.weekdays.length;

  const setPerWeek = (n: number) => update((d) => { d.schedule = { kind: 'weekly', weekdays: DEFAULT_DAYS[n], required: n }; });
  const toggleDay = (day: number) => update((d) => {
    const s = d.schedule.kind === 'weekly' ? d.schedule : weekly;
    const has = s.weekdays.includes(day);
    if (!has && s.weekdays.length >= perWeek) return;
    d.schedule = { kind: 'weekly', required: perWeek, weekdays: has ? s.weekdays.filter((x) => x !== day) : [...s.weekdays, day].sort() };
  });

  function validate() {
    if (!t!.name.trim()) return 'נא לתת שם לתוכנית';
    if (!t!.days.length) return 'צריך לפחות יום אימון אחד';
    const empty = t!.days.find((d) => !d.exercises.length);
    if (empty) return `ביום "${empty.name}" אין תרגילים`;
    if (weekly.weekdays.length !== perWeek) return `בחר ${perWeek} ימים קבועים בשבוע (נבחרו ${weekly.weekdays.length})`;
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setBusy(true);
    try {
      await store.save({ ...t!, name: t!.name.trim(), schedule: weekly, sort_order: t!.sort_order ?? store.nextOrder(t!.category) });
      navigate('/admin-programs');
    } catch (e) { setError('השמירה נכשלה: ' + (e as Error).message); setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await store.remove(t!.id!); navigate('/admin-programs'); }
    catch (e) { setError('המחיקה נכשלה: ' + (e as Error).message); setBusy(false); }
  }

  return (
    <div className="stack">
      <a href="#/admin-programs" className="muted">→ כל התוכניות</a>
      <h2>{isNew ? 'תוכנית חדשה' : 'עריכת תוכנית'}</h2>

      <div className="card stack tight">
        <label>שם התוכנית<input id="tpl-name" value={t.name} onChange={(e) => update((d) => { d.name = e.target.value; })} placeholder="למשל: גינת כושר למתקדמים" /></label>
        <label>תיאור קצר<input id="tpl-desc" value={t.description} onChange={(e) => update((d) => { d.description = e.target.value; })} placeholder="למשל: 4 אימונים בשבוע, עליון ותחתון" /></label>
        <span className="small muted">קטגוריה</span>
        <div className="segmented" role="radiogroup" aria-label="קטגוריה">
          {TEMPLATE_CATEGORIES.map((c) => (
            <button key={c.key} type="button" role="radio" aria-checked={t.category === c.key} className={t.category === c.key ? 'on' : ''}
              onClick={() => update((d) => { d.category = c.key; })}>{c.icon} {c.label}</button>
          ))}
        </div>
        <label>ציוד נדרש<input id="tpl-equipment" value={t.equipment} onChange={(e) => update((d) => { d.equipment = e.target.value; })} placeholder="למשל: מוט מתח ומקבילים" /></label>
      </div>

      <div className="card stack tight">
        <h3 style={{ margin: 0 }}>📅 ימי אימון</h3>
        <label>כמה ימים בשבוע
          <select id="tpl-per-week" value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} ימים</option>)}
          </select>
        </label>
        <span className="small muted">ימי ברירת המחדל (המשתמש יוכל לשנות): {weekly.weekdays.length}/{perWeek}</span>
        <div className="weekday-row">
          {LETTERS.map((l, d) => (
            <button key={d} type="button" className={weekly.weekdays.includes(d) ? 'on' : ''} aria-pressed={weekly.weekdays.includes(d)} onClick={() => toggleDay(d)}>{l}</button>
          ))}
        </div>
        <span className="muted small">האימונים מתחלפים לפי הסדר בימים האלה.</span>
      </div>

      {t.days.map((day, di) => (
        <div key={di} className="card stack tight">
          <div className="row gap">
            <input className="grow" value={day.name} aria-label="שם היום" onChange={(e) => update((d) => { d.days[di].name = e.target.value; })} />
            {t.days.length > 1 && <button className="icon-btn" aria-label="מחיקת יום" onClick={() => update((d) => { d.days.splice(di, 1); })}>🗑️</button>}
          </div>
          {day.exercises.length > 0 && <div className="prog-grid head"><span>תרגיל</span><span>סטים</span><span>חזרות</span><span /></div>}
          {day.exercises.map((ex, ei) => (
            <div key={ei} className="prog-grid">
              <span>{ex.name}</span>
              <input type="number" min="1" value={ex.sets} aria-label="סטים" onChange={(e) => update((d) => { d.days[di].exercises[ei].sets = Number(e.target.value); })} />
              <input type="number" min="1" value={ex.reps} aria-label="חזרות" onChange={(e) => update((d) => { d.days[di].exercises[ei].reps = Number(e.target.value); })} />
              <button className="icon-btn" aria-label="הסרה" onClick={() => update((d) => { d.days[di].exercises.splice(ei, 1); })}>✕</button>
            </div>
          ))}
          <ExercisePicker onPick={(name) => update((d) => { d.days[di].exercises.push({ name, sets: 3, reps: 10 }); })} />
        </div>
      ))}
      <button className="btn dashed" onClick={() => update((d) => { d.days.push({ name: `יום ${d.days.length + 1}`, exercises: [] }); })}>+ הוספת יום אימון</button>

      {error && <p className="notice" role="alert" style={{ margin: 0 }}>{error}</p>}
      <button className="btn primary big" disabled={busy} onClick={save}>{busy ? 'שומר…' : 'שמירת תוכנית'}</button>

      {!isNew && (confirmDelete ? (
        <div className="card confirm-card stack tight" role="alertdialog" aria-label="מחיקת תוכנית">
          <strong>למחוק את "{t.name}"?</strong>
          <span className="small">התוכנית לא תופיע יותר למשתמשים. מי שכבר בחר אותה ימשיך להתאמן לפיה.</span>
          <div className="row gap">
            <button className="btn danger" disabled={busy} onClick={remove}>כן, למחוק</button>
            <button className="btn" onClick={() => setConfirmDelete(false)}>ביטול</button>
          </div>
        </div>
      ) : <button className="btn danger" onClick={() => setConfirmDelete(true)}>🗑️ מחיקת התוכנית</button>)}
    </div>
  );
}
