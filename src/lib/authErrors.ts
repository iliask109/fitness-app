/** Supabase auth messages in Hebrew, for display. */
export function authErrorHe(m: string) {
  if (/banned/i.test(m)) return 'החשבון שלך נחסם. פנה למנהל';
  if (/invalid login/i.test(m)) return 'אימייל או סיסמה שגויים';
  if (/already registered/i.test(m)) return 'המשתמש כבר קיים. נסה להתחבר';
  if (/email not confirmed/i.test(m)) return 'צריך לאשר את האימייל לפני ההתחברות';
  if (/expired or is invalid|otp_expired|invalid.*(token|otp)/i.test(m)) return 'הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש';
  if (/different from the old password/i.test(m)) return 'הסיסמה החדשה צריכה להיות שונה מהסיסמה הקודמת';
  if (/rate limit|too many|security purposes|seconds/i.test(m)) return 'נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות';
  if (/valid email|invalid.*email/i.test(m)) return 'כתובת האימייל לא תקינה';
  if (/password/i.test(m)) return 'הסיסמה צריכה להכיל לפחות 6 תווים';
  if (/fetch|network/i.test(m)) return 'אין חיבור לאינטרנט. נסה שוב';
  return m;
}
