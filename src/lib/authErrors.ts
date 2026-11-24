import { tr } from './i18n';

/** Supabase auth messages in the user's language, for display. */
export function authErrorHe(m: string) {
  if (/banned/i.test(m)) return tr('החשבון שלך נחסם. פנה למנהל', 'Your account has been blocked. Contact the admin');
  if (/invalid login/i.test(m)) return tr('אימייל או סיסמה שגויים', 'Wrong email or password');
  if (/already registered/i.test(m)) return tr('המשתמש כבר קיים. נסה להתחבר', 'This user already exists. Try signing in');
  if (/email not confirmed/i.test(m)) return tr('צריך לאשר את האימייל לפני ההתחברות', 'Please confirm your email before signing in');
  if (/expired or is invalid|otp_expired|invalid.*(token|otp)/i.test(m)) return tr('הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש', 'The code is wrong or has expired. You can request a new one');
  if (/different from the old password/i.test(m)) return tr('הסיסמה החדשה צריכה להיות שונה מהסיסמה הקודמת', 'The new password must be different from the old one');
  if (/rate limit|too many|security purposes|seconds/i.test(m)) return tr('נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות', 'Too many requests. Try again in a few minutes');
  if (/valid email|invalid.*email/i.test(m)) return tr('כתובת האימייל לא תקינה', 'The email address is not valid');
  if (/password/i.test(m)) return tr('הסיסמה צריכה להכיל לפחות 6 תווים', 'The password must be at least 6 characters');
  if (/fetch|network/i.test(m)) return tr('אין חיבור לאינטרנט. נסה שוב', 'No internet connection. Try again');
  return m;
}
