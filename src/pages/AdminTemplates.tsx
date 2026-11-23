import { useTemplates } from '../lib/templateStore';
import { TEMPLATE_CATEGORIES } from '../lib/templates';
import { DAY_STYLES, dayStyle } from '../lib/dayStyle';
import { describeSchedule } from '../lib/schedule';
import type { Program } from '../lib/types';

/** Admin: the ready-made programs every user can choose from. */
export default function AdminTemplates() {
  const t = useTemplates();
  return (
    <div className="stack">
      <div className="row between">
        <h2>📋 תוכניות מוכנות</h2>
        {!t.builtInOnly && <a className="btn primary" href="#/admin-programs/new">+ תוכנית חדשה</a>}
      </div>
      <p className="muted small" style={{ margin: 0 }}>אלה התוכניות שמשתמשים יכולים לבחור. שינוי כאן לא משנה תוכנית שמשתמש כבר בחר (יש לו עותק משלו).</p>
      {t.builtInOnly && (
        <p className="notice" style={{ margin: 0 }}>כדי לנהל תוכניות צריך להריץ ב-Supabase את הקובץ <span dir="ltr">update-6-program-templates.sql</span>. עד אז מוצגות התוכניות המובנות, בלי אפשרות עריכה.</p>
      )}
      {t.loading && <p className="muted">טוען…</p>}
      {TEMPLATE_CATEGORIES.map((c) => {
        const list = t.list.filter((x) => x.category === c.key);
        return (
          <section key={c.key} className="stack tight">
            <div className="row gap"><span className="category-icon">{c.icon}</span><strong className="category-title">{c.label}</strong><span className="muted small">{list.length} תוכניות</span></div>
            {!list.length && <p className="muted small" style={{ margin: 0 }}>אין תוכניות בקטגוריה הזו.</p>}
            {list.map((p) => (
              <div key={p.id} className="card template-card">
                <div className="row between">
                  <strong>{p.name}</strong>
                  {!t.builtInOnly && <a className="btn small" href={`#/admin-programs/${p.id}`}>✏️ עריכה</a>}
                </div>
                <span className="muted small">{p.description}</span>
                <span className="small">📅 {describeSchedule({ ...p, id: p.id ?? '' } as Program)} · 🧰 {p.equipment}</span>
                <div className="chips">
                  {p.days.map((d, i) => { const st = DAY_STYLES[dayStyle(d)]; return <span key={i} className="style-chip" style={{ '--accent': st.color } as React.CSSProperties}>{st.icon} {d.name} · {d.exercises.length}</span>; })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
