/**
 * Illustrations from Free Exercise DB (github.com/yuhonas/free-exercise-db, public domain / Unlicense),
 * stored in public/exercises/<id>/0.jpg and 1.jpg (two positions of the movement). Exercises without a matching image are left out.
 */
const IMAGE_IDS: Record<string, string> = {
  'לחיצת חזה במוט': 'Barbell_Bench_Press_-_Medium_Grip',
  'לחיצת חזה במשקולות': 'Dumbbell_Bench_Press',
  'לחיצת חזה בשיפוע עליון': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'פרפר במכונה': 'Butterfly',
  'שכיבות סמיכה': 'Pushups',
  'שכיבות סמיכה צרות': 'Push-Ups_-_Close_Triceps_Position',
  'שכיבות סמיכה בשיפוע': 'Incline_Push-Up',
  'מקבילים': 'Dips_-_Chest_Version',
  'מתח': 'Pullups',
  'מתח אוסטרלי': 'Inverted_Row',
  'פולי עליון': 'Wide-Grip_Lat_Pulldown',
  'חתירה במוט': 'Bent_Over_Barbell_Row',
  'חתירה במשקולת': 'One-Arm_Dumbbell_Row',
  'חתירה בכבל': 'Seated_Cable_Rows',
  'דדליפט': 'Barbell_Deadlift',
  'סופרמן': 'Superman',
  'סקוואט': 'Barbell_Squat',
  'סקוואט במשקל גוף': 'Bodyweight_Squat',
  'סקוואט גביע': 'Goblet_Squat',
  'סקוואט בולגרי': 'Split_Squat_with_Dumbbells',
  'פיסטול סקוואט בעזרה': 'Kettlebell_Pistol_Squat',
  'לחיצת רגליים': 'Leg_Press',
  'לאנג׳ים': 'Dumbbell_Lunges',
  'לאנג׳ים בהליכה': 'Bodyweight_Walking_Lunge',
  'דדליפט רומני': 'Romanian_Deadlift',
  'דדליפט רומני במשקולות': 'Stiff-Legged_Dumbbell_Deadlift',
  'גשר ישבן': 'Butt_Lift_Bridge',
  'קפיצות לספסל': 'Front_Box_Jump',
  'פשיטת ברכיים': 'Leg_Extensions',
  'כפיפת ברכיים': 'Lying_Leg_Curls',
  'הרמות עקב': 'Standing_Calf_Raises',
  'לחיצת כתפיים': 'Standing_Military_Press',
  'לחיצת כתפיים במשקולות': 'Dumbbell_Shoulder_Press',
  'הרחקה לצדדים': 'Side_Lateral_Raise',
  'פייס פול': 'Face_Pull',
  'פרפר אחורי': 'Reverse_Flyes',
  'כפיפת מרפקים במוט': 'Barbell_Curl',
  'כפיפת מרפקים במשקולות': 'Dumbbell_Bicep_Curl',
  'כפיפת פטישים': 'Hammer_Curls',
  'פשיטת מרפקים בכבל': 'Triceps_Pushdown',
  'פשיטת מרפקים מעל הראש': 'Standing_Dumbbell_Triceps_Extension',
  'לחיצה צרפתית': 'EZ-Bar_Skullcrusher',
  'דיפס על כיסא': 'Bench_Dips',
  'דיפס על ספסל': 'Bench_Dips',
  'פלאנק': 'Plank',
  'פלאנק צידי': 'Side_Bridge',
  'כפיפות בטן': 'Crunches',
  'הרמות רגליים בתלייה': 'Hanging_Leg_Raise',
  'הרמות ברכיים בתלייה': 'Knee_Hip_Raise_On_Parallel_Bars',
  'גלגל בטן': 'Ab_Roller',
  'מטפסי הרים': 'Mountain_Climbers',
};

/** Two pictures of the movement, or null when there is none. */
export function exerciseImages(name: string): [string, string] | null {
  const id = IMAGE_IDS[name];
  return id ? [`/exercises/${id}/0.jpg`, `/exercises/${id}/1.jpg`] : null;
}

export const EXERCISE_IMAGE_IDS = IMAGE_IDS;
