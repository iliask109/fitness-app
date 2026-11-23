import type { ProgramDay, ProgramSchedule } from './types';

export type TemplateCategory = 'gym' | 'home' | 'outdoor';

/** Categories match the training locations chosen on the details page (profile.training_locations). */
export const TEMPLATE_CATEGORIES: { key: TemplateCategory; label: string; icon: string; note: string }[] = [
  { key: 'gym', label: 'מכון כושר', icon: '🏋️', note: 'מכשירים, מוטות ומשקולות' },
  { key: 'home', label: 'אימון בבית', icon: '🏠', note: 'בלי ציוד, או עם משקולות יד' },
  { key: 'outdoor', label: 'מתקנים בחוץ', icon: '🌳', note: 'מוט מתח, מקבילים וספסל בגינת כושר' },
];

export interface ProgramTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  /** What you need, in one short line. */
  equipment: string;
  schedule: ProgramSchedule;
  days: ProgramDay[];
}

const E = (name: string, sets: number, reps: number) => ({ name, sets, reps });

/** Ready-made programs a user can copy into their own list. Reps of timed exercises (plank) are seconds. */
export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  // ---------- Gym ----------
  {
    name: 'מתחילים: כל הגוף',
    description: '3 אימונים בשבוע, כל הגוף בכל אימון',
    category: 'gym', equipment: 'מכון כושר',
    schedule: { kind: 'weekly', weekdays: [0, 2, 4], required: 3 },
    days: [
      { name: 'אימון A', exercises: [E('סקוואט', 3, 8), E('לחיצת חזה במוט', 3, 8), E('חתירה במוט', 3, 8), E('פלאנק', 3, 30)] },
      { name: 'אימון B', exercises: [E('דדליפט', 3, 5), E('לחיצת כתפיים', 3, 8), E('פולי עליון', 3, 10), E('לאנג׳ים', 3, 10)] },
    ],
  },
  {
    name: 'Push / Pull / Legs',
    description: '4 אימונים בשבוע: דחיפה, משיכה ורגליים ברוטציה',
    category: 'gym', equipment: 'מכון כושר',
    schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 },
    days: [
      { name: 'Push: דחיפה', exercises: [E('לחיצת חזה במוט', 4, 6), E('לחיצת חזה בשיפוע עליון', 3, 10), E('לחיצת כתפיים', 3, 8), E('הרחקה לצדדים', 3, 15), E('פשיטת מרפקים בכבל', 3, 12)] },
      { name: 'Pull: משיכה', exercises: [E('מתח', 4, 6), E('חתירה במוט', 3, 8), E('חתירה בכבל', 3, 12), E('פייס פול', 3, 15), E('כפיפת מרפקים במוט', 3, 10)] },
      { name: 'Legs: רגליים', exercises: [E('סקוואט', 4, 6), E('דדליפט רומני', 3, 8), E('לחיצת רגליים', 3, 12), E('כפיפת ברכיים', 3, 12), E('הרמות עקב', 4, 15)] },
    ],
  },
  {
    name: 'עליון / תחתון',
    description: '4 אימונים בשבוע: עליון ותחתון לסירוגין',
    category: 'gym', equipment: 'מכון כושר',
    schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 },
    days: [
      { name: 'עליון', exercises: [E('לחיצת חזה במוט', 4, 6), E('חתירה במוט', 4, 6), E('לחיצת כתפיים', 3, 10), E('פולי עליון', 3, 10), E('כפיפת פטישים', 3, 12)] },
      { name: 'תחתון', exercises: [E('סקוואט', 4, 6), E('דדליפט רומני', 3, 8), E('לאנג׳ים', 3, 10), E('הרמות עקב', 4, 15), E('הרמות רגליים בתלייה', 3, 12)] },
    ],
  },
  {
    name: 'ספליט 5 ימים',
    description: '5 אימונים בשבוע, קבוצת שרירים אחת בכל אימון',
    category: 'gym', equipment: 'מכון כושר',
    schedule: { kind: 'weekly', weekdays: [0, 1, 2, 3, 4], required: 5 },
    days: [
      { name: 'חזה', exercises: [E('לחיצת חזה במוט', 4, 8), E('לחיצת חזה בשיפוע עליון', 4, 10), E('לחיצת חזה במשקולות', 3, 10), E('פרפר במכונה', 3, 12), E('מקבילים', 3, 10)] },
      { name: 'גב', exercises: [E('מתח', 4, 6), E('חתירה במוט', 4, 8), E('פולי עליון', 3, 10), E('חתירה בכבל', 3, 12), E('דדליפט', 3, 5)] },
      { name: 'רגליים', exercises: [E('סקוואט', 4, 6), E('לחיצת רגליים', 4, 10), E('דדליפט רומני', 3, 8), E('פשיטת ברכיים', 3, 12), E('כפיפת ברכיים', 3, 12), E('הרמות עקב', 4, 15)] },
      { name: 'כתפיים', exercises: [E('לחיצת כתפיים', 4, 8), E('הרחקה לצדדים', 4, 15), E('פרפר אחורי', 3, 15), E('פייס פול', 3, 15)] },
      { name: 'ידיים ובטן', exercises: [E('כפיפת מרפקים במוט', 4, 10), E('כפיפת פטישים', 3, 12), E('פשיטת מרפקים בכבל', 4, 12), E('לחיצה צרפתית', 3, 10), E('הרמות רגליים בתלייה', 3, 12), E('פלאנק', 3, 45)] },
    ],
  },

  // ---------- Home ----------
  {
    name: 'בבית: משקל גוף',
    description: '3 אימונים בשבוע, כל הגוף, בלי שום ציוד',
    category: 'home', equipment: 'בלי ציוד (רק כיסא יציב ומזרן)',
    schedule: { kind: 'weekly', weekdays: [0, 2, 4], required: 3 },
    days: [
      { name: 'כל הגוף A', exercises: [E('סקוואט במשקל גוף', 4, 15), E('שכיבות סמיכה', 4, 10), E('לאנג׳ים', 3, 12), E('גשר ישבן', 3, 15), E('דיפס על כיסא', 3, 10), E('פלאנק', 3, 30)] },
      { name: 'כל הגוף B', exercises: [E('סקוואט בולגרי', 3, 10), E('שכיבות סמיכה צרות', 3, 10), E('סופרמן', 3, 15), E('שכיבות סמיכה פייק', 3, 8), E('מטפסי הרים', 3, 30), E('בורפיז', 3, 10)] },
    ],
  },
  {
    name: 'בבית: משקולות יד',
    description: '4 אימונים בשבוע: עליון ותחתון לסירוגין',
    category: 'home', equipment: 'זוג משקולות יד',
    schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 },
    days: [
      { name: 'עליון', exercises: [E('לחיצת חזה במשקולות', 4, 10), E('חתירה במשקולת', 4, 10), E('לחיצת כתפיים במשקולות', 3, 10), E('הרחקה לצדדים', 3, 15), E('כפיפת מרפקים במשקולות', 3, 12), E('פשיטת מרפקים מעל הראש', 3, 12)] },
      { name: 'תחתון', exercises: [E('סקוואט גביע', 4, 12), E('דדליפט רומני במשקולות', 4, 10), E('לאנג׳ים', 3, 12), E('גשר ישבן', 3, 15), E('הרמות עקב', 4, 20), E('פלאנק', 3, 40)] },
    ],
  },

  // ---------- Outdoor ----------
  {
    name: 'גינת כושר: מתחילים',
    description: '3 אימונים בשבוע, כל הגוף על המתקנים',
    category: 'outdoor', equipment: 'מוט מתח, מקבילים וספסל',
    schedule: { kind: 'weekly', weekdays: [0, 2, 4], required: 3 },
    days: [
      { name: 'כל הגוף A', exercises: [E('מתח אוסטרלי', 4, 10), E('שכיבות סמיכה', 4, 12), E('סקוואט במשקל גוף', 4, 15), E('דיפס על ספסל', 3, 12), E('הרמות ברכיים בתלייה', 3, 10), E('פלאנק', 3, 30)] },
      { name: 'כל הגוף B', exercises: [E('מתח', 4, 5), E('שכיבות סמיכה בשיפוע', 3, 12), E('לאנג׳ים', 3, 12), E('מקבילים', 3, 6), E('סקוואט בולגרי', 3, 10), E('כפיפות בטן', 3, 20)] },
    ],
  },
  {
    name: 'קליסטניקס: עליון / תחתון',
    description: '4 אימונים בשבוע למי שכבר עושה מתח ומקבילים',
    category: 'outdoor', equipment: 'מוט מתח, מקבילים וספסל',
    schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 },
    days: [
      { name: 'עליון', exercises: [E('מתח', 5, 6), E('מקבילים', 4, 10), E('מתח אוסטרלי', 3, 12), E('שכיבות סמיכה פייק', 3, 10), E('שכיבות סמיכה', 3, 20), E('הרמות רגליים בתלייה', 4, 10)] },
      { name: 'תחתון', exercises: [E('סקוואט בולגרי', 4, 10), E('קפיצות לספסל', 4, 8), E('לאנג׳ים בהליכה', 3, 20), E('פיסטול סקוואט בעזרה', 3, 6), E('הרמות עקב', 4, 20), E('פלאנק צידי', 3, 30)] },
    ],
  },
];
