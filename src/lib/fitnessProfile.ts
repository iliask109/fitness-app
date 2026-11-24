import { addMonths } from './utils';
import { tr } from './i18n';

/** Choices for the training profile filled in after sign-up. Keys are stored; labels are shown. */

export const EXPERIENCE = [
  { key: 'none', get label() { return tr('מתחיל לגמרי', 'Complete beginner'); }, get hint() { return tr('עוד לא התאמנתי', "I haven't trained yet"); } },
  { key: 'lt1', get label() { return tr('פחות משנה', 'Less than a year'); }, get hint() { return tr('התחלתי לאחרונה', 'I started recently'); } },
  { key: '1-3', get label() { return tr('1 עד 3 שנים', '1 to 3 years'); }, get hint() { return tr('יש לי בסיס', 'I have a base'); } },
  { key: '3-5', get label() { return tr('3 עד 5 שנים', '3 to 5 years'); }, get hint() { return tr('מתאמן ותיק', 'Seasoned trainee'); } },
  { key: '5+', get label() { return tr('יותר מ-5 שנים', 'More than 5 years'); }, get hint() { return tr('מתאמן מנוסה', 'Experienced trainee'); } },
] as const;

export const GOALS = [
  { key: 'bulk', get label() { return tr('מסה', 'Build muscle'); }, icon: '💪', get hint() { return tr('לבנות שריר ולעלות במשקל', 'Build muscle and gain weight'); } },
  { key: 'cut', get label() { return tr('ירידה במשקל', 'Lose weight'); }, icon: '🔥', get hint() { return tr('להוריד שומן ולשמור על שריר', 'Lose fat and keep muscle'); } },
  { key: 'maintain', get label() { return tr('שימור', 'Maintain'); }, icon: '⚖️', get hint() { return tr('לשמור על הכושר והמשקל', 'Keep your fitness and weight'); } },
] as const;

export const LOCATIONS = [
  { key: 'gym', get label() { return tr('מכון כושר', 'Gym'); }, icon: '🏋️' },
  { key: 'home', get label() { return tr('בבית', 'At home'); }, icon: '🏠' },
  { key: 'outdoor', get label() { return tr('מתקנים בחוץ', 'Outdoor gym'); }, icon: '🌳' },
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
  { key: 3, get label() { return tr('3 חודשים', '3 months'); } },
  { key: 6, get label() { return tr('חצי שנה', '6 months'); } },
  { key: 12, get label() { return tr('שנה', '1 year'); } },
] as const;

/** Target date of the goal (YYYY-MM-DD), or null when no period was chosen. */
export function goalEndDate(p: { goal_months?: number | null; goal_start?: string | null; onboarded_at?: string | null }) {
  const start = p.goal_start ?? p.onboarded_at?.slice(0, 10);
  if (!p.goal_months || !start) return null;
  return addMonths(start, p.goal_months);
}
