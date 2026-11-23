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
import AdminAccount from './pages/AdminAccount';
import { ThemeToggle } from './components/ThemeControls';

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
  const { isAdmin, adminChecked } = useAuth();
  if (!adminChecked) return <div className="center muted">טוען…</div>;
  return isAdmin ? <AdminShell /> : <UserShell />;
}

const ADMIN_TABS = [
  { key: 'admin', label: 'משתמשים', icon: '👥' },
  { key: 'settings', label: 'חשבון', icon: '⚙️' },
];

function AdminShell() {
  const route = useRoute();
  const [section = '', sub] = route.path;
  const tab = section === 'settings' ? 'settings' : 'admin';
  const page = section === 'settings' ? <AdminAccount />
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
  const { signOut } = useAuth();
  const route = useRoute();
  const me = useProfile();

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
    case 'workouts': page = sub ? <WorkoutEditor id={sub} query={route.query} /> : <Workouts />; break;
    case 'programs': page = sub ? <ProgramEditor id={sub} /> : <Programs />; break;
    case 'nutrition': page = <Nutrition />; break;
    case 'progress': page = <Progress />; break;
    case 'settings': page = <Settings />; break;
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
