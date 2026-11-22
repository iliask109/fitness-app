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
  { key: 'cut', label: 'חיטוב', icon: '🔥', hint: 'להוריד שומן ולשמור על שריר' },
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
