import { ACCESSIBILITY_CONTACT as C, STATEMENT_UPDATED } from '../lib/accessibilityContact';
import { formatDate } from '../lib/utils';
import { isEn, tr } from '../lib/i18n';

/** Accessibility statement (Equal Rights for Persons with Disabilities regulations, 2013 / IS 5568). */
export default function AccessibilityStatement({ signedIn = true }: { signedIn?: boolean }) {
  const hasContact = !!(C.name || C.email || C.phone);
  const en = isEn();
  const li = (he: string, enText: string) => <li>{tr(he, enText)}</li>;
  return (
    <article className="stack statement">
      <a href="#/" className="muted">{signedIn ? tr('→ חזרה', '← Back') : tr('→ חזרה לכניסה', '← Back to sign in')}</a>
      <h2>{tr('הצהרת נגישות', 'Accessibility statement')}</h2>

      <section className="card stack tight">
        <p>{tr(
          'אנחנו ב-FitLogix רואים חשיבות רבה בכך שכל אחד ואחת יוכלו להשתמש באפליקציה בקלות ובעצמאות, כולל אנשים עם מוגבלות. השקענו בהתאמת האפליקציה כדי שתהיה נוחה ונגישה לכולם.',
          'At FitLogix we want everyone to be able to use the app easily and independently, including people with disabilities. We have worked to make the app comfortable and accessible for all.')}</p>
      </section>

      <section className="card stack tight">
        <h3>{tr('רמת הנגישות', 'Accessibility level')}</h3>
        <p>{tr(
          'האפליקציה הותאמה לדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013, ולתקן הישראלי ת"י 5568, המבוסס על הנחיות הנגישות לתוכן אינטרנט WCAG 2.0 ברמה AA. בנוסף נבדקה מול WCAG 2.1 ברמה AA.',
          'The app was adapted to the Israeli Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations, 2013, and to Israeli Standard 5568, which is based on the Web Content Accessibility Guidelines WCAG 2.0 level AA. It was also checked against WCAG 2.1 level AA.')}</p>
      </section>

      <section className="card stack tight">
        <h3>{tr('מה עשינו', 'What we did')}</h3>
        <ul className="guide-list">
          {li('תפריט נגישות (כפתור ♿ בראש כל מסך): הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, עצירת אנימציות וגופן קריא.', 'An accessibility menu (the ♿ button at the top of every screen): larger text, high contrast, underlined links, stopping animations and a readable font.')}
          {li('אפשר להשתמש בכל האפליקציה במקלדת בלבד, עם סימון ברור של המקום שבו נמצאים, וקישור "דילוג לתוכן".', 'The whole app works with a keyboard only, with a clear focus indicator and a "Skip to content" link.')}
          {li('תמיכה בקוראי מסך: כותרות, תוויות לכל שדה וכפתור, תיאור לתמונות ולגרפים, והכרזה על הודעות שגיאה.', 'Screen reader support: headings, labels for every field and button, descriptions for images and charts, and announced error messages.')}
          {li('ניגודיות צבעים לפי התקן בתצוגה הבהירה ובתצוגה הכהה, וצבע אינו הדרך היחידה להעביר מידע.', 'Color contrast that meets the standard in both light and dark mode, and color is never the only way information is shown.')}
          {li('אפשר להגדיל את המסך בדפדפן עד 200% בלי לאבד תוכן, והאפליקציה מכבדת את הגדרת "הפחתת תנועה" של המכשיר.', 'You can zoom the browser to 200% without losing content, and the app respects the device\'s "reduce motion" setting.')}
          {li('חלונות קופצים: המיקוד עובר אליהם, נשאר בתוכם וחוזר בסגירה, ומקש Esc סוגר אותם.', 'Pop-up windows: focus moves into them, stays inside and returns when they close, and the Esc key closes them.')}
          {li('האפליקציה זמינה בעברית ובאנגלית (בהגדרות), עם כיוון כתיבה מתאים לכל שפה.', 'The app is available in Hebrew and English (in Settings), with the right text direction for each.')}
        </ul>
      </section>

      <section className="card stack tight">
        <h3>{tr('דפדפנים ומכשירים', 'Browsers and devices')}</h3>
        <p>{tr('האפליקציה נבדקה בדפדפנים Chrome, Safari, Edge ו-Firefox בגרסאות עדכניות, בטלפון ובמחשב.', 'The app was checked in up-to-date Chrome, Safari, Edge and Firefox, on phones and computers.')}</p>
      </section>

      <section className="card stack tight">
        <h3>{tr('חלקים שאינם נגישים במלואם', 'Parts that are not fully accessible')}</h3>
        <ul className="guide-list">
          {li('הגרפים בדף ההתקדמות הם ויזואליים; לצד כל גרף מוצג תיאור טקסט של עיקר הנתונים.', 'The charts on the Progress page are visual; each has a text description of its main data.')}
          {li('סרטוני ההדגמה נפתחים ביוטיוב, אתר חיצוני שאינו בשליטתנו.', 'Demo videos open on YouTube, an external site we do not control.')}
          {li('איורי התרגילים מגיעים ממאגר חיצוני; לכל איור יש תיאור טקסט, וההסבר המלא כתוב לצידו.', 'Exercise illustrations come from an external library; each has a text description, and the full explanation is written next to it.')}
        </ul>
        <p className="muted small">{tr('אנחנו ממשיכים לשפר את הנגישות. אם נתקלת בבעיה, נשמח לשמוע.', 'We keep improving accessibility. If you run into a problem, we would like to hear about it.')}</p>
      </section>

      <section className="card stack tight">
        <h3>{tr('פנייה בנושא נגישות', 'Accessibility contact')}</h3>
        {hasContact ? (
          <ul className="guide-list">
            {C.name && <li>{tr('רכז/ת הנגישות:', 'Accessibility coordinator:')} {C.name}</li>}
            {C.email && <li>{tr('אימייל:', 'Email:')} <a href={`mailto:${C.email}`} dir="ltr">{C.email}</a></li>}
            {C.phone && <li>{tr('טלפון:', 'Phone:')} <a href={`tel:${C.phone.replace(/[^\d+]/g, '')}`} dir="ltr">{C.phone}</a></li>}
          </ul>
        ) : <p>{tr('פרטי רכז/ת הנגישות יפורסמו כאן בקרוב.', 'The accessibility coordinator\'s details will be published here soon.')}</p>}
        {signedIn && <p>{tr('אפשר גם לכתוב לנו ישירות מהאפליקציה: הגדרות ← "פנייה למנהל".', 'You can also write to us from the app: Settings → "Contact the admin".')} <a href="#/settings?chat=1">{tr('לפנייה', 'Write to us')}</a></p>}
        <p className="muted small">{tr('נשמח לקבל תיאור של הבעיה, באיזה מסך היא הופיעה, ובאיזה מכשיר ודפדפן. נשתדל לענות תוך 5 ימי עבודה.', 'Please describe the problem, the screen where it happened, and your device and browser. We aim to reply within 5 working days.')}</p>
      </section>

      <p className="muted small">{tr('ההצהרה עודכנה בתאריך', 'Statement last updated')} {formatDate(STATEMENT_UPDATED, { day: 'numeric', month: 'long', year: 'numeric' })}{en ? '.' : '.'}</p>
    </article>
  );
}
