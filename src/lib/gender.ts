export type Gender = 'male' | 'female';

export const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: 'זכר' },
  { key: 'female', label: 'נקבה' },
];

/** Picks the Hebrew wording for the user's gender; "אתה בטוח/ה?"-style when it is unknown. */
export function byGender(gender: string | null | undefined, male: string, female: string, unknown?: string) {
  if (gender === 'male') return male;
  if (gender === 'female') return female;
  return unknown ?? `${male}/${female}`;
}
