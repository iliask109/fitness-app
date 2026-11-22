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

/** The signed-in app. Until the training profile is filled in, only the onboarding page is shown. */
function Shell() {
  const { isAdmin, signOut } = useAuth();
  const route = useRoute();
  const me = useProfile();

  if (me.loading && !me.profile.onboarded_at) return <div className="center muted">טוען…</div>;
  if (!me.profile.onboarded_at && !me.error) {
    return (
      <div className="app">
        <header className="topbar">
          <span className="brand">💪 FitLogix</span>
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
    case 'admin': page = sub ? <AdminUser id={sub} /> : <AdminUsers />; break;
    default: page = <Dashboard />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">💪 FitLogix</span>
        {isDemo && <span className="badge">מצב הדגמה</span>}
        {isAdmin && <button className="icon-btn" onClick={() => navigate('/admin')} aria-label="ניהול משתמשים">🛡️</button>}
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
