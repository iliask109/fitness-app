import { useEffect, useState } from 'react';
import { tr } from '../lib/i18n';
import type { Program } from '../lib/types';
import { requiredDays, scheduleOf, weekdayLetters } from '../lib/schedule';

const NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Choose the weekdays a program is trained on. Programs with a required count (4 for
 * Push/Pull/Legs and Upper/Lower, 3 for beginners) save once exactly that many are picked.
 */
export default function WeekdayPicker({ program, onSave, highlight, doneText = tr('✓ נשמר', '✓ Saved') }: {
  program: Program;
  onSave: (weekdays: number[], required: number | null) => Promise<unknown>;
  highlight?: boolean;
  /** Text shown once a complete set of days is chosen (the editor saves later, with the program). */
  doneText?: string;
}) {
  const required = requiredDays(program);
  const s = scheduleOf(program);
  const savedDays = s.kind === 'weekly' ? s.weekdays : [];
  const [picked, setPicked] = useState<number[]>(savedDays);
  const [note, setNote] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setPicked(savedDays); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [program.id, savedDays.join()]);

  async function toggle(d: number) {
    setSaved(false);
    let next: number[];
    if (picked.includes(d)) next = picked.filter((x) => x !== d);
    else {
      if (required && picked.length >= required) {
        setNote(tr(`התוכנית הזו היא ${required} ימים בשבוע. בטל קודם יום אחר.`, `This program is ${required} days a week. Unselect another day first.`));
        return;
      }
      next = [...picked, d].sort();
    }
    setNote(null);
    setPicked(next);
    const complete = required ? next.length === required : next.length > 0;
    if (complete) {
      await onSave(next, required);
      setSaved(true);
    }
  }

  const missing = required ? required - picked.length : picked.length ? 0 : 1;
  return (
    <div className={'weekday-picker stack tight' + (highlight ? ' highlight' : '')}>
      <div className="row between">
        <span className="small"><strong>📅 {tr('ימי האימון שלי', 'My training days')}</strong>{required ? <span className="muted"> · {tr(`${required} ימים בשבוע`, `${required} days a week`)}</span> : null}</span>
        <span className={'small ' + (missing > 0 ? 'muted' : 'good')}>
          {missing > 0 ? (required ? tr(`בחר עוד ${missing}`, `Choose ${missing} more`) : tr('בחר ימים', 'Choose days')) : saved ? doneText : tr(`${picked.length} ימים`, `${picked.length} days`)}
        </span>
      </div>
      <div className="weekday-row" role="group" aria-label={tr('ימי אימון', 'Training days')}>
        {weekdayLetters().map((l, d) => (
          <button key={d} type="button" className={picked.includes(d) ? 'on' : ''} aria-pressed={picked.includes(d)}
            aria-label={tr(`יום ${NAMES_HE[d]}`, NAMES_EN[d])} onClick={() => toggle(d)}>{l}</button>
        ))}
      </div>
      {note && <span className="small notice" style={{ margin: 0 }}>{note}</span>}
      {s.kind === 'cycle' && missing > 0 && <span className="muted small">{tr('כרגע לפי הסדר, בלי ימים קבועים. בחר ימים כדי לקבע אותם.', 'For now it goes in order, without fixed days. Choose days to fix them.')}</span>}
    </div>
  );
}
