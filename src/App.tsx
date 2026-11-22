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

const TABS = [
  { key: '', label: 'בית', icon: '🏠' },
  { key: 'workouts', label: 'אימונים', icon: '🏋️' },
  { key: 'programs', label: 'תוכניות', icon: '📋' },
  { key: 'nutrition', label: 'תזונה', icon: '🥗' },
  { key: 'progress', label: 'התקדמות', icon: '📈' },
];

export default function App() {
  const { user, loading } = useAuth();
  const route = useRoute();

  if (loading) return <div className="center muted">טוען…</div>;
  if (!user) return <Login />;

  const [section = '', sub] = route.path;
  let page;
  switch (section) {
    case 'workouts': page = sub ? <WorkoutEditor id={sub} query={route.query} /> : <Workouts />; break;
    case 'programs': page = sub ? <ProgramEditor id={sub} /> : <Programs />; break;
    case 'nutrition': page = <Nutrition />; break;
    case 'progress': page = <Progress />; break;
    case 'settings': page = <Settings />; break;
    default: page = <Dashboard />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">💪 FitTrack</span>
        {isDemo && <span className="badge">מצב הדגמה</span>}
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
