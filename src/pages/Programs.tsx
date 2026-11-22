import { useTable } from '../lib/useTable';
import { navigate } from '../lib/router';
import { PROGRAM_TEMPLATES } from '../lib/templates';
import type { Program } from '../lib/types';

export default function Programs() {
  const { rows, loading, save } = useTable<Program>('programs');

  async function addTemplate(i: number) {
    const t = PROGRAM_TEMPLATES[i];
    const p = await save({ name: t.name, days: structuredClone(t.days) });
    navigate(`/programs/${p.id}`);
  }

  return (
    <div className="stack">
      <div className="row between">
        <h2>תוכניות אימון</h2>
        <a className="btn primary" href="#/programs/new">+ תוכנית חדשה</a>
      </div>

      {loading && <p className="muted">טוען…</p>}
      {rows.map((p) => (
        <div key={p.id} className="card">
          <div className="row between">
            <strong>{p.name}</strong>
            <a className="btn small" href={`#/programs/${p.id}`}>עריכה</a>
          </div>
          <div className="stack tight">
            {p.days.map((d, i) => (
              <div key={i} className="list-item">
                <div>
                  <div>{d.name}</div>
                  <div className="muted small">{d.exercises.map((e) => e.name).join(' · ')}</div>
                </div>
                <a className="btn primary small" href={`#/workouts/new?program=${p.id}&day=${i}`}>▶ התחלה</a>
              </div>
            ))}
          </div>
        </div>
      ))}

      <h3>תוכניות מוכנות</h3>
      {PROGRAM_TEMPLATES.map((t, i) => (
        <div key={t.name} className="card row between">
          <div>
            <strong>{t.name}</strong>
            <div className="muted small">{t.description} · {t.days.length} ימי אימון</div>
          </div>
          <button className="btn small" onClick={() => addTemplate(i)}>הוספה</button>
        </div>
      ))}
    </div>
  );
}
