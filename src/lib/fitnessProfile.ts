/** Choices for the training profile filled in after sign-up. Keys are stored; labels are shown. */

export const EXPERIENCE = [
  { key: 'none', label: 'מתחיל לגמרי', hint: 'עוד לא התאמנתי' },
  { key: 'lt1', label: 'פחות משנה', hint: 'התחלתי לאחרונה' },
  { key: '1-3', label: '1 עד 3 שנים', hint: 'יש לי בסיס' },
  { key: '3-5', label: '3 עד 5 שנים', hint: 'מתאמן ותיק' },
  { key: '5+', label: 'יותר מ-5 שנים', hint: 'מתאמן מנוסה' },
] as const;

export const GOALS = [
  { key: 'bulk', label: 'מסה', icon: '💪', hint: 'לבנות שריר ולעלות במשקל' },
  { key: 'cut', label: 'ירידה במשקל', icon: '🔥', hint: 'להוריד שומן ולשמור על שריר' },
  { key: 'maintain', label: 'שימור', icon: '⚖️', hint: 'לשמור על הכושר והמשקל' },
] as const;

export const LOCATIONS = [
  { key: 'gym', label: 'מכון כושר', icon: '🏋️' },
  { key: 'home', label: 'בבית', icon: '🏠' },
  { key: 'outdoor', label: 'מתקנים בחוץ', icon: '🌳' },
] as const;

export const FULL_GYM = 'מכון מאובזר';
export const NO_EQUIPMENT = 'ללא ציוד';

/** Equipment suggested per training location. */
export const EQUIPMENT_BY_LOCATION: Record<string, string[]> = {
  gym: [FULL_GYM],
  home: ['משקולות יד', 'מוט ומשקולות', 'קטלבל', 'גומיות התנגדות', 'ספסל', 'מוט מתח', 'TRX', 'הליכון / אופני כושר', 'מזרן'],
  outdoor: ['מוט מתח', 'מקבילים', 'ספסל', 'גומיות התנגדות', 'TRX'],
};

export const labelOf = (list: readonly { key: string; label: string }[], key?: string | null) =>
  list.find((x) => x.key === key)?.label ?? '–';

export const GOAL_PERIODS = [
  { key: 3, label: '3 חודשים' },
  { key: 6, label: 'חצי שנה' },
  { key: 12, label: 'שנה' },
] as const;

/** Target date of the goal (YYYY-MM-DD), or null when no period was chosen. */
export function goalEndDate(p: { goal_months?: number | null; goal_start?: string | null; onboarded_at?: string | null }) {
  const start = p.goal_start ?? p.onboarded_at?.slice(0, 10);
  if (!p.goal_months || !start) return null;
  const d = new Date(start + 'T12:00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + p.goal_months);
  // Clamp to the month's last day (31 Aug + 6 months = 28/29 Feb, not 3 Mar).
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
