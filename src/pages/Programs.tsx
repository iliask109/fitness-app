import { useTable } from '../lib/useTable';
import { navigate } from '../lib/router';
import { PROGRAM_TEMPLATES } from '../lib/templates';
import { DAY_STYLES, dayStyle } from '../lib/dayStyle';
import type { Program } from '../lib/types';
import DayCard from '../components/DayCard';
import { useProfile } from '../lib/useProfile';
import { activeProgram, describeSchedule } from '../lib/schedule';
import type { Workout } from '../lib/types';

export default function Programs() {
  const { rows, loading, save } = useTable<Program>('programs');
  const workouts = useTable<Workout>('workouts');
  const me = useProfile();
  const active = activeProgram(rows, workouts.rows, me.profile);

  async function addTemplate(i: number) {
    const t = PROGRAM_TEMPLATES[i];
    const p = await save({ name: t.name, days: structuredClone(t.days), schedule: t.schedule });
    await me.save({ active_program_id: p.id });
    navigate(`/programs/${p.id}`);
  }

  return (
    <div className="stack">
      <div className="row between">
        <h2>תוכניות אימון</h2>
        <a className="btn primary" href="#/programs/new">+ תוכנית חדשה</a>
      </div>

      {loading && <p className="muted">טוען…</p>}
      {!loading && rows.length === 0 && (
        <div className="card muted">עוד אין לך תוכניות. צור תוכנית חדשה או הוסף אחת מהתוכניות המוכנות למטה.</div>
      )}

      {rows.map((p) => (
        <section key={p.id} className="program-section">
          <div className="row between">
            <div className="stack tight" style={{ gap: 2, minWidth: 0 }}>
              <div className="row gap">
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                {active?.id === p.id && <span className="chip active-chip">⭐ התוכנית הפעילה</span>}
              </div>
              <span className="muted small">📅 {describeSchedule(p)}</span>
            </div>
            <div className="row gap">
              {active?.id !== p.id && <button className="btn small" onClick={() => me.save({ active_program_id: p.id })}>⭐ הפעלה</button>}
              <a className="btn small" href={`#/programs/${p.id}`}>✏️ עריכה</a>
            </div>
          </div>
          <div className="day-cards">
            {p.days.map((d, i) => <DayCard key={i} day={d} startHref={`#/workouts/new?program=${p.id}&day=${i}`} />)}
          </div>
        </section>
      ))}

      <h3 style={{ marginTop: 8 }}>✨ תוכניות מוכנות</h3>
      {PROGRAM_TEMPLATES.map((t, i) => (
        <div key={t.name} className="card template-card">
          <div className="row between">
            <strong>{t.name}</strong>
            <button className="btn primary small" onClick={() => addTemplate(i)}>+ הוספה</button>
          </div>
          <span className="muted small">{t.description}</span>
          <div className="chips">
            {t.days.map((d) => {
              const s = DAY_STYLES[dayStyle(d)];
              return (
                <span key={d.name} className="style-chip" style={{ '--accent': s.color } as React.CSSProperties}>
                  {s.icon} {d.name}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
