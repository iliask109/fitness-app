import type { ProgramDay, ProgramSchedule } from './types';

/** Ready-made programs a user can copy into their own list. */
export const PROGRAM_TEMPLATES: { name: string; description: string; schedule: ProgramSchedule; days: ProgramDay[] }[] = [
  {
    name: 'מתחילים: כל הגוף',
    description: '3 אימונים בשבוע, כל הגוף בכל אימון',
    schedule: { kind: 'weekly', weekdays: [0, 2, 4], required: 3 },
    days: [
      { name: 'אימון A', exercises: [
        { name: 'סקוואט', sets: 3, reps: 8 }, { name: 'לחיצת חזה במוט', sets: 3, reps: 8 },
        { name: 'חתירה במוט', sets: 3, reps: 8 }, { name: 'פלאנק', sets: 3, reps: 30 } ] },
      { name: 'אימון B', exercises: [
        { name: 'דדליפט', sets: 3, reps: 5 }, { name: 'לחיצת כתפיים', sets: 3, reps: 8 },
        { name: 'פולי עליון', sets: 3, reps: 10 }, { name: 'לאנג׳ים', sets: 3, reps: 10 } ] },
    ],
  },
  {
    name: 'Push / Pull / Legs',
    description: '4 אימונים בשבוע: דחיפה, משיכה ורגליים ברוטציה',
    schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 },
    days: [
      { name: 'Push: דחיפה', exercises: [
        { name: 'לחיצת חזה במוט', sets: 4, reps: 6 }, { name: 'לחיצת חזה בשיפוע עליון', sets: 3, reps: 10 },
        { name: 'לחיצת כתפיים', sets: 3, reps: 8 }, { name: 'הרחקה לצדדים', sets: 3, reps: 15 },
        { name: 'פשיטת מרפקים בכבל', sets: 3, reps: 12 } ] },
      { name: 'Pull: משיכה', exercises: [
        { name: 'מתח', sets: 4, reps: 6 }, { name: 'חתירה במוט', sets: 3, reps: 8 },
        { name: 'חתירה בכבל', sets: 3, reps: 12 }, { name: 'פייס פול', sets: 3, reps: 15 },
        { name: 'כפיפת מרפקים במוט', sets: 3, reps: 10 } ] },
      { name: 'Legs: רגליים', exercises: [
        { name: 'סקוואט', sets: 4, reps: 6 }, { name: 'דדליפט רומני', sets: 3, reps: 8 },
        { name: 'לחיצת רגליים', sets: 3, reps: 12 }, { name: 'כפיפת ברכיים', sets: 3, reps: 12 },
        { name: 'הרמות עקב', sets: 4, reps: 15 } ] },
    ],
  },
  {
    name: 'עליון / תחתון',
    description: '4 אימונים בשבוע: עליון ותחתון לסירוגין',
    schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 },
    days: [
      { name: 'עליון', exercises: [
        { name: 'לחיצת חזה במוט', sets: 4, reps: 6 }, { name: 'חתירה במוט', sets: 4, reps: 6 },
        { name: 'לחיצת כתפיים', sets: 3, reps: 10 }, { name: 'פולי עליון', sets: 3, reps: 10 },
        { name: 'כפיפת פטישים', sets: 3, reps: 12 } ] },
      { name: 'תחתון', exercises: [
        { name: 'סקוואט', sets: 4, reps: 6 }, { name: 'דדליפט רומני', sets: 3, reps: 8 },
        { name: 'לאנג׳ים', sets: 3, reps: 10 }, { name: 'הרמות עקב', sets: 4, reps: 15 },
        { name: 'הרמות רגליים בתלייה', sets: 3, reps: 12 } ] },
    ],
  },
];
