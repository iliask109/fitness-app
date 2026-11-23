import { useAuth } from './lib/auth';
import { navigate, useRoute } from './lib/router';
import { isDemo } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import WorkoutEditor from './pages/WorkoutEditor';
import Programs from './pages/Programs';
import ProgramEditor from './pages/ProgramEditor';
import Nutrition from './pages/Nutrition';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import AdminUsers from './pages/AdminUsers';
import AdminUser from './pages/AdminUser';
import Onboarding from './pages/Onboarding';
import { useProfile } from './lib/useProfile';
import { useEffect } from 'react';
import { syncDeviceSubscription } from './lib/push';
import AdminAccount from './pages/AdminAccount';
import AdminTemplates from './pages/AdminTemplates';
import AdminTemplateEditor from './pages/AdminTemplateEditor';
import ExerciseLibrary from './pages/ExerciseLibrary';
import { ThemeToggle } from './components/ThemeControls';
import SetPassword from './components/SetPassword';

const TABS = [
  { key: '', label: 'בית', icon: '🏠' },
  { key: 'workouts', label: 'אימונים', icon: '🏋️' },
  { key: 'programs', label: 'תוכניות', icon: '📋' },
  { key: 'nutrition', label: 'תזונה', icon: '🥗' },
  { key: 'progress', label: 'התקדמות', icon: '📈' },
];

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">טוען…</div>;
  if (!user) return <Login />;
  return <Shell key={user.id} />;
}

/** Admins get the management app only; everyone else gets the training app. */
function Shell() {
  const { isAdmin, adminChecked, mustSetPassword } = useAuth();
  // Signed in with a recovery code or link: nothing else until a new password is saved.
  if (mustSetPassword) {
    return (
      <div className="app">
        <header className="topbar"><span className="brand">FitLogix</span><ThemeToggle /></header>
        <main className="content onboarding-only"><SetPassword forced onDone={() => navigate('/')} /></main>
      </div>
    );
  }
  if (!adminChecked) return <div className="center muted">טוען…</div>;
  return isAdmin ? <AdminShell /> : <UserShell />;
}

const ADMIN_TABS = [
  { key: 'admin', label: 'משתמשים', icon: '👥' },
  { key: 'admin-programs', label: 'תוכניות', icon: '📋' },
  { key: 'settings', label: 'חשבון', icon: '⚙️' },
];

function AdminShell() {
  const route = useRoute();
  const [section = '', sub] = route.path;
  const tab = section === 'settings' || section === 'admin-programs' ? section : 'admin';
  const page = section === 'settings' ? <AdminAccount />
    : section === 'admin-programs' ? (sub ? <AdminTemplateEditor key={sub} id={sub} /> : <AdminTemplates />)
    : section === 'admin' && sub ? <AdminUser id={sub} />
    : <AdminUsers />;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/admin" aria-label="מסך הבית">FitLogix</a>
        {isDemo && <span className="badge">מצב הדגמה</span>}
        <span className="chip tag-admin">🛡️ מנהל</span>
        <ThemeToggle />
      </header>
      <main className="content">{page}</main>
      <nav className="tabbar">
        {ADMIN_TABS.map((t) => (
          <a key={t.key} href={'#/' + t.key} className={tab === t.key ? 'active' : ''}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

/** The training app. Until the training profile is filled in, only the onboarding page is shown. */
function UserShell() {
  const { signOut, user } = useAuth();
  const route = useRoute();
  const me = useProfile();
  const remindersOn = !!me.profile.reminder_enabled;
  // Once notifications are allowed, keep this device registered on every app open (e.g. after signing back in).
  useEffect(() => {
    if (!me.loading && user) syncDeviceSubscription(user.id, remindersOn);
  }, [me.loading, user, remindersOn]);

  if (me.loading && !me.profile.onboarded_at) return <div className="center muted">טוען…</div>;
  if (!me.profile.onboarded_at && !me.error) {
    return (
      <div className="app">
        <header className="topbar">
          <span className="brand">FitLogix</span>
          <ThemeToggle />
          <button className="btn small" onClick={signOut}>התנתקות</button>
        </header>
        <main className="content onboarding-only">
          <Onboarding profile={me.profile} save={me.save} onDone={() => { me.reload(); navigate("/"); }} />
        </main>
      </div>
    );
  }

  const [section = '', sub] = route.path;
  let page;
  switch (section) {
    case 'workouts': page = sub ? <WorkoutEditor key={sub + "?" + route.query.toString()} id={sub} query={route.query} /> : <Workouts />; break;
    case 'programs': page = sub ? <ProgramEditor id={sub} /> : <Programs />; break;
    case 'nutrition': page = <Nutrition />; break;
    case 'progress': page = <Progress />; break;
    case 'settings': page = <Settings />; break;
    case 'exercises': page = <ExerciseLibrary />; break;
    case 'profile-setup': page = <Onboarding editing profile={me.profile} save={me.save} onDone={() => { me.reload(); navigate('/settings'); }} />; break;
    default: page = <Dashboard />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/" aria-label="מסך הבית">FitLogix</a>
        {isDemo && <span className="badge">מצב הדגמה</span>}
        <ThemeToggle />
        <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="הגדרות">⚙️</button>
      </header>
      <main className="content">{page}</main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <a key={t.key} href={'#/' + t.key} className={section === t.key ? 'active' : ''}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
