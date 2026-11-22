import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { checkIsAdmin, isDemoBanned, recordDemoLogin } from './admin';
import { saveRow } from './db';

export interface AppUser { id: string; email: string }

export interface SignUpDetails {
  first_name: string;
  last_name: string;
  age: number;
  birth_date?: string;
}

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  /** False until the admin check for the current user has finished. */
  adminChecked: boolean;
  adminCheckError?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, details: SignUpDetails) => Promise<{ needsConfirm: boolean }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const DEMO_KEY = 'fittrack:demo-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string>();
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    setIsAdmin(false);
    setAdminChecked(false);
    setAdminCheckError(undefined);
    if (user) checkIsAdmin(user.id).then((r) => { setIsAdmin(r.admin); setAdminCheckError(r.error); setAdminChecked(true); });
  }, [user?.id]);

  useEffect(() => {
    if (!supabase) {
      try {
        const saved = localStorage.getItem(DEMO_KEY);
        if (saved) setUser(JSON.parse(saved));
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '' } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '' } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const demoLogin = (email: string) => {
    const u = { id: 'demo-' + email.toLowerCase(), email };
    if (isDemoBanned(u.id)) throw new Error('User is banned');
    recordDemoLogin(u.id, email);
    localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    setUser(u);
  };

  const value: AuthCtx = {
    user,
    loading,
    isAdmin,
    adminChecked,
    adminCheckError,
    async signIn(email, password) {
      if (!supabase) return demoLogin(email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password, details) {
      const meta = { ...details, birth_date: details.birth_date || null, display_name: details.first_name };
      if (!supabase) {
        const id = 'demo-' + email.toLowerCase();
        await saveRow(id, 'profiles', { id, ...meta });
        demoLogin(email);
        return { needsConfirm: false };
      }
      // The details travel as user metadata; a database trigger (update-2-signup.sql) creates the profile.
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: meta } });
      if (error) throw error;
      return { needsConfirm: !data.session };
    },
    async signOut() {
      if (!supabase) { localStorage.removeItem(DEMO_KEY); setUser(null); return; }
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
