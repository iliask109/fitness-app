import { tr } from './i18n';

export type Gender = 'male' | 'female';

export const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', get label() { return tr('זכר', 'Male'); } },
  { key: 'female', get label() { return tr('נקבה', 'Female'); } },
];

/** Picks the Hebrew wording for the user's gender; "אתה בטוח/ה?"-style when it is unknown. For English, wrap the call: tr(byGender(...), 'English'). */
export function byGender(gender: string | null | undefined, male: string, female: string, unknown?: string) {
  if (gender === 'male') return male;
  if (gender === 'female') return female;
  return unknown ?? `${male}/${female}`;
}
