import { useTable } from '../lib/useTable';
import { TEMPLATE_CATEGORIES } from '../lib/templates';
import { useTemplates } from '../lib/templateStore';
import { DAY_STYLES, dayStyle } from '../lib/dayStyle';
import type { Program } from '../lib/types';
import DayCard from '../components/DayCard';
import { useProfile } from '../lib/useProfile';
import { activeProgram, describeSchedule } from '../lib/schedule';
import type { Workout } from '../lib/types';
import WeekdayPicker from '../components/WeekdayPicker';
import { useEffect, useState } from 'react';
import { useRoute } from '../lib/router';

export default function Programs() {
  const { rows, loading, save, remove } = useTable<Program>('programs');
  const workouts = useTable<Workout>('workouts');
  const me = useProfile();
  const active = activeProgram(rows, workouts.rows, me.profile);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  // "#/programs?focus=<id>" (from the home screen) jumps to that program's training days.
  const focus = useRoute().query.get('focus');
  useEffect(() => {
    if (!focus || loading) return;
    setJustAdded(focus);
    setTimeout(() => document.getElementById('program-' + focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [focus, loading]);

  async function saveDays(p: Program, weekdays: number[], required: number | null) {
    await save({ ...p, schedule: { kind: 'weekly', weekdays, ...(required ? { required } : {}) } });
    // The weekly goal on the home screen follows the active program's days.
    if (active?.id === p.id) await me.save({ training_days: weekdays.length });
  }

  const [confirmSwitch, setConfirmSwitch] = useState(false);
  /** One program at a time: switching removes the current one (finished workouts stay). */
  async function switchProgram() {
    if (!active) return;
    await remove(active.id);
    await me.save({ active_program_id: null });
    setConfirmSwitch(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function addTemplate(t: (typeof templates.list)[number]) {
    const p = await save({ name: t.name, days: structuredClone(t.days), schedule: t.schedule });
    await me.save({ active_program_id: p.id, ...(t.schedule.kind === 'weekly' ? { training_days: t.schedule.weekdays.length } : {}) });
    // Stay here so the new program's training days can be picked right away.
    setJustAdded(p.id);
    setTimeout(() => document.getElementById('program-' + p.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  const locked = !!active;
  const templates = useTemplates();
  // Categories that don't fit start collapsed; tap the header to open them.
  const [opened, setOpened] = useState<string[]>([]);
  // Categories where the user said they train (details page) come first.
  const where = me.profile.training_locations ?? [];
  const categories = TEMPLATE_CATEGORIES
    .map((c) => ({ ...c, fits: where.includes(c.key) }))
    .sort((a, b) => Number(b.fits) - Number(a.fits));
  const anyFits = categories.some((c) => c.fits);
  const isOpen = (key: string, fits: boolean) => !anyFits || fits || opened.includes(key);
  const others = rows.filter((p) => p.id !== active?.id);

  const programSection = (p: Program) => (
    <section key={p.id} id={'program-' + p.id} className="program-section">
      <div className="row between">
        <div className="stack tight" style={{ gap: 2, minWidth: 0 }}>
          <div className="row gap">
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            <span className="chip active-chip">⭐ התוכנית שלי</span>
          </div>
          <span className="muted small">📅 {describeSchedule(p)}</span>
        </div>
        <div className="row gap">
          <a className="btn small" href={`#/programs/${p.id}`}>✏️ עריכה</a>
          <button className="btn small" onClick={() => setConfirmSwitch(true)}>🔄 החלפת תוכנית</button>
        </div>
      </div>
      {confirmSwitch && (
        <div className="card confirm-card stack tight" role="alertdialog" aria-label="החלפת תוכנית">
          <strong>להחליף תוכנית?</strong>
          <span className="small">התוכנית "{p.name}" תוסר, ואז תוכל לבחור תוכנית אחרת. האימונים שכבר עשית יישמרו.</span>
          <div className="row gap">
            <button className="btn danger" onClick={switchProgram}>כן, להחליף</button>
            <button className="btn" onClick={() => setConfirmSwitch(false)}>ביטול</button>
          </div>
        </div>
      )}
      <WeekdayPicker program={p} highlight={justAdded === p.id} onSave={(days, req) => saveDays(p, days, req)} />
      <div className="day-cards">
        {p.days.map((d, i) => <DayCard key={i} day={d} startHref={`#/workouts/new?program=${p.id}&day=${i}`} />)}
      </div>
    </section>
  );

  const styleChips = (days: Program['days']) => (
    <div className="chips">
      {days.map((d, i) => {
        const st = DAY_STYLES[dayStyle(d)];
        return <span key={i} className="style-chip" style={{ '--accent': st.color } as React.CSSProperties}>{st.icon} {d.name}</span>;
      })}
    </div>
  );

  return (
    <div className="stack">
      <div className="row between">
        <h2>תוכניות אימון</h2>
        {locked
          ? <button className="btn primary" disabled title="יש לך כבר תוכנית">+ תוכנית חדשה</button>
          : <a className="btn primary" href="#/programs/new">+ תוכנית חדשה</a>}
      </div>

      {loading && <p className="muted">טוען…</p>}

      {active && programSection(active)}

      {!loading && !locked && (
        <>
          <div className="card muted">עוד אין לך תוכנית. בחר אחת מהתוכניות המוכנות או בנה תוכנית משלך.</div>
          <h3 style={{ marginTop: 8 }}>✨ תוכניות מוכנות</h3>
          {templates.loading && <p className="muted">טוען…</p>}
          {categories.map((c) => {
            const list = templates.list.filter((t) => t.category === c.key);
            if (!list.length) return null;
            const open = isOpen(c.key, c.fits);
            const toggle = () => setOpened((o) => (o.includes(c.key) ? o.filter((k) => k !== c.key) : [...o, c.key]));
            return (
            <section key={c.key} className={'template-category stack tight' + (open ? '' : ' collapsed')}>
              <button type="button" className="category-head" onClick={anyFits && !c.fits ? toggle : undefined}
                aria-expanded={open} disabled={!anyFits || c.fits}>
                <span className="category-icon">{c.icon}</span>
                <span className="grow stack" style={{ gap: 0 }}>
                  <span className="row gap"><strong className="category-title">{c.label}</strong>{c.fits && <span className="chip fits-chip">מתאים לך</span>}</span>
                  <span className="muted small">{open ? c.note : `${list.length} תוכניות · ${c.note}`}</span>
                </span>
                {anyFits && !c.fits && <span className="category-chevron" aria-hidden>{open ? '▴' : '▾'}</span>}
              </button>
              {open && list.map((t) => (
                <div key={t.id ?? t.name} className="card template-card">
                  <div className="row between">
                    <strong>{t.name}</strong>
                    <button className="btn primary small" onClick={() => addTemplate(t)}>+ בחירה</button>
                  </div>
                  <span className="muted small">{t.description}</span>
                  <span className="small">🧰 {t.equipment}</span>
                  {styleChips(t.days)}
                </div>
              ))}
            </section>
            );
          })}
          <p className="muted small" style={{ margin: 0 }}>אחרי הבחירה תוכל לבחור את ימי האימון שלך.</p>
        </>
      )}

      {!loading && locked && (
        <div className="locked-area stack tight">
          <div className="locked-note small">🔒 אפשר להתאמן לפי תוכנית אחת בכל פעם. כדי לבחור תוכנית אחרת, לחץ "🔄 החלפת תוכנית".</div>
          <div className="locked-list" aria-disabled="true" {...{ inert: '' }}>
            {[...others.map((p) => ({ key: p.id, name: p.name, days: p.days })),
              ...templates.list.map((t) => ({ key: t.id ?? t.name, name: `${TEMPLATE_CATEGORIES.find((c) => c.key === t.category)?.icon} ${t.name}`, days: t.days }))].map((x) => (
              <div key={x.key} className="locked-row">
                <strong>{x.name}</strong>
                {styleChips(x.days)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
