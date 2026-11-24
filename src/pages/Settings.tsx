import { FormEvent, useEffect, useState } from 'react';
import { getLang, isEn, Lang, setLang, tr } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useProfile } from '../lib/useProfile';
import { isDemo } from '../lib/supabase';
import { navigate } from '../lib/router';
import { ageFromBirthDate, todayISO } from '../lib/utils';
import { ThemePicker } from '../components/ThemeControls';
import SetPassword from '../components/SetPassword';
import { GENDERS } from '../lib/gender';
import NotificationSettings from '../components/NotificationSettings';
import ConfirmInline from '../components/ConfirmInline';
import MessageThread from '../components/MessageThread';
import { unread, useThread } from '../lib/messages';
import { deleteMyAccount } from '../lib/admin';
import { byGender } from '../lib/gender';


export default function Settings() {
  const { user, signOut, adminCheckError } = useAuth();
  const { profile, loading, save } = useProfile();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [openChat, setOpenChat] = useState(() => new URLSearchParams(location.hash.split('?')[1]).has('chat'));
  const thread = useThread(user?.id, 60000);
  const unreadFromAdmin = unread(thread.messages, 'admin');
  const [langBusy, setLangBusy] = useState(false);
  const [langError, setLangError] = useState<string | null>(null);

  /** Saved on the profile first (reminders use it, and the app follows the profile), then the app switches. */
  async function changeLanguage(l: Lang) {
    if (l === getLang()) return;
    setLangBusy(true);
    setLangError(null);
    try {
      await save({ language: l });
      setLang(l);
    } catch (e) {
      setLangError(tr('השמירה נכשלה: ', 'Saving failed: ') + (e as Error).message);
      setLangBusy(false);
    }
  }
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount(user!.id);
      await signOut().catch(() => undefined);
      navigate('/');
    } catch (e) {
      setDeleteError((e as Error).message);
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    const f: Record<string, string> = {
      first_name: profile.first_name ?? profile.display_name ?? '', last_name: profile.last_name ?? '',
      age: profile.birth_date ? String(ageFromBirthDate(profile.birth_date)) : profile.age == null ? '' : String(profile.age),
      birth_date: profile.birth_date ?? '',
      gender: profile.gender ?? '',
    };
    setForm(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const age = Number(form.age);
    const patch: Record<string, unknown> = {
      first_name: form.first_name.trim() || null, last_name: form.last_name.trim() || null,
      display_name: form.first_name.trim() || null,
      age: Number.isInteger(age) && age > 0 ? age : null, birth_date: form.birth_date || null,
      gender: form.gender === 'male' || form.gender === 'female' ? form.gender : null,
    };
    await save(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="stack">
      <h2>{tr('הגדרות', 'Settings')}</h2>
      <div className="card stack">
      <button type="button" className="collapse-head" aria-expanded={openDetails} onClick={() => setOpenDetails(!openDetails)}>
        <h3>👤 {tr('פרטים אישיים', 'Personal details')}{isDemo ? '' : tr(' וסיסמה', ' and password')}</h3>
        <span className="collapse-arrow" aria-hidden>{openDetails ? '▴' : '▾'}</span>
      </button>
      {openDetails && <>
      <form onSubmit={submit} className="stack">
        <div className="grid2">
          <label>{tr('שם פרטי', 'First name')}<input maxLength={60} value={form.first_name ?? ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label>
          <label>{tr('שם משפחה', 'Last name')}<input maxLength={60} value={form.last_name ?? ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label>
          <label>{tr('גיל', 'Age')}<input type="number" min={10} max={120} value={form.age ?? ''} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
          <label><span>{tr('תאריך לידה', 'Birth date')} <span className="optional">{tr('(לא חובה)', '(optional)')}</span></span>
            <input type="date" max={todayISO()} value={form.birth_date ?? ''} onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, birth_date: v, age: v ? String(ageFromBirthDate(v)) : form.age });
            }} /></label>
        </div>
        <span className="small muted">{tr('מגדר', 'Gender')}</span>
        <div className="segmented" role="radiogroup" aria-label={tr('מגדר', 'Gender')}>
          {GENDERS.map((g) => (
            <button key={g.key} type="button" role="radio" aria-checked={form.gender === g.key}
              className={form.gender === g.key ? 'on' : ''} onClick={() => setForm({ ...form, gender: g.key })}>{g.label}</button>
          ))}
        </div>
        <button className="btn primary">{saved ? tr('✓ נשמר', '✓ Saved') : tr('שמירת פרטים', 'Save details')}</button>
      </form>
      {!isDemo && <><hr className="divider" /><SetPassword embedded /></>}
      </>}
      </div>
      <div className="card stack">
        <h3>{tr('🎯 יעדים', '🎯 Goals')}</h3>
        <a className="btn" href="#/profile-setup">{tr('🏋️ עריכת פרופיל אימון (גובה, מטרה, משקל יעד, ציוד…)', '🏋️ Edit training profile (height, goal, target weight, equipment…)')}</a>
        <p className="muted small">{tr('יעדי הקלוריות, החלבון, הפחמימות והשומן מחושבים אוטומטית לפי המשקל שלך ומתעדכנים כל חודש. אפשר לראות אותם בדף ההתקדמות.', 'Your calorie, protein, carb and fat goals are calculated automatically from your weight and updated every month. You can see them on the Progress page.')}</p>
      </div>
      <div className="card stack tight" id="contact-admin">
        <button type="button" className="collapse-head" aria-expanded={openChat} onClick={() => setOpenChat(!openChat)}>
          <h3>✉️ {tr('פנייה למנהל', 'Contact the admin')} {unreadFromAdmin > 0 && <span className="unread-dot">{unreadFromAdmin}</span>}</h3>
          <span className="collapse-arrow" aria-hidden>{openChat ? '▴' : '▾'}</span>
        </button>
        {openChat && user && <MessageThread uid={user.id} as="user" />}
      </div>
      <NotificationSettings />
      <ThemePicker />
      <a className="btn" href="#/accessibility">♿ {tr('הצהרת נגישות', 'Accessibility statement')}</a>
      <div className="card stack tight">
        <h3>🌐 {tr('שפה', 'Language')}</h3>
        <div className="segmented" role="radiogroup" aria-label={tr('שפה', 'Language')}>
          {(['he', 'en'] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={getLang() === l} className={getLang() === l ? 'on' : ''} disabled={langBusy}
              onClick={() => changeLanguage(l)}>{l === 'he' ? 'עברית' : 'English'}</button>
          ))}
        </div>
        {langError && <p className="notice" role="alert" style={{ margin: 0 }}>{langError}</p>}
      </div>
      <div className="card stack tight">
        <div className="muted small">{tr('מחובר בתור', 'Signed in as')}</div>
        <div dir="ltr" style={{ textAlign: isEn() ? 'left' : 'right' }}>{user?.email}</div>
        {adminCheckError && <div className="notice" dir="ltr">admin check: {adminCheckError}</div>}
        {isDemo && <p className="notice">{tr('מצב הדגמה: הנתונים נשמרים רק בדפדפן הזה. כדי לשמור בענן, הגדר Supabase לפי ה-README.', 'Demo mode: data is saved only in this browser. To save in the cloud, set up Supabase as described in the README.')}</p>}
        <button className="btn danger" onClick={async () => { await signOut(); navigate('/'); }}>{tr('התנתקות', 'Sign out')}</button>
      </div>
      <div className="card stack tight">
        <h3>{tr('🗑️ מחיקת החשבון', '🗑️ Delete account')}</h3>
        <p className="muted small" style={{ margin: 0 }}>{tr('מוחקת את החשבון ואת כל הנתונים שלו לצמיתות.', 'Permanently deletes the account and all its data.')}</p>
        {deleteError && <p className="notice" role="alert">{deleteError}</p>}
        {askDelete ? (
          <ConfirmInline
            message={tr(byGender(profile.gender, 'אתה בטוח?', 'את בטוחה?', 'בטוח/ה?') + ' כל הנתונים שלך יימחקו לצמיתות: אימונים, תוכניות, תזונה, שקילות והפרופיל. אי אפשר לשחזר אותם.', 'Are you sure? All your data will be deleted permanently: workouts, programs, nutrition, weigh-ins and your profile. It cannot be restored.')}
            confirmLabel={tr('כן, למחוק את החשבון', 'Yes, delete my account')} busy={deleting}
            onConfirm={deleteAccount} onCancel={() => setAskDelete(false)} />
        ) : (
          <button className="btn danger" onClick={() => setAskDelete(true)}>{tr('מחיקת החשבון', 'Delete account')}</button>
        )}
      </div>
    </div>
  );
}
