import { useAuth } from '../lib/auth';
import { isDemo } from '../lib/supabase';
import { navigate } from '../lib/router';
import { ThemePicker } from '../components/ThemeControls';

/** Account page for admins: who is signed in, and sign out. No training settings. */
export default function AdminAccount() {
  const { user, signOut } = useAuth();
  return (
    <div className="stack">
      <h2>חשבון</h2>
      <div className="card stack tight">
        <div className="muted small">מחובר בתור</div>
        <div dir="ltr" style={{ textAlign: 'right' }}>{user?.email}</div>
        <div className="small">הרשאה: 🛡️ מנהל</div>
        {isDemo && <p className="notice">מצב הדגמה: הנתונים נשמרים רק בדפדפן הזה.</p>}
        <button className="btn danger" onClick={async () => { await signOut(); navigate('/'); }}>התנתקות</button>
      </div>
      <ThemePicker />
      <p className="muted small">כדי להוסיף מנהל נוסף: היכנס לדף של המשתמש ברשימה ולחץ "הפיכה למנהל".</p>
    </div>
  );
}
