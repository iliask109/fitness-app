import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { checkIsAdmin, isDemoBanned, recordDemoLogin } from './admin';
import { saveRow } from './db';
import { disablePushOnDevice } from './push';
import { clearTables } from './tableStore';

export interface AppUser { id: string; email: string }

export interface SignUpDetails {
  first_name: string;
  last_name: string;
  age: number;
  birth_date?: string;
  gender: 'male' | 'female';
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
  /** Emails a one-hour recovery code (and link) to the address. */
  requestPasswordReset: (email: string) => Promise<{ demoCode?: string }>;
  /** Signs in with the emailed code; the user must then choose a new password. */
  verifyResetCode: (email: string, code: string) => Promise<void>;
  /** Sets a new password for the signed-in user. */
  updatePassword: (password: string) => Promise<void>;
  /** True after signing in with a recovery code or link, until a new password is saved. */
  mustSetPassword: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);
const DEMO_KEY = 'fittrack:demo-user';
const DEMO_RESET_KEY = 'fitlogix:demo-reset';
/** Survives a refresh, so a recovery sign-in cannot skip choosing a new password by reloading. */
const MUST_SET_KEY = 'fitlogix:must-set-password';
const RESET_VALID_MS = 60 * 60 * 1000;

function readFlag() {
  try { return localStorage.getItem(MUST_SET_KEY) === '1'; } catch { return false; }
}
function writeFlag(on: boolean) {
  try { on ? localStorage.setItem(MUST_SET_KEY, '1') : localStorage.removeItem(MUST_SET_KEY); } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string>();
  const [adminChecked, setAdminChecked] = useState(false);
  const [mustSetPassword, setMustSetPasswordState] = useState(readFlag);
  const setMustSetPassword = (on: boolean) => { writeFlag(on); setMustSetPasswordState(on); };

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
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Arrived through the reset link in the email: require a new password before anything else.
      if (event === 'PASSWORD_RECOVERY') setMustSetPassword(true);
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
      setMustSetPassword(false);
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
      setMustSetPassword(false);
      // This device stops getting the signed-out user's reminders.
      if (user) await disablePushOnDevice(user.id);
      clearTables();
      if (!supabase) { localStorage.removeItem(DEMO_KEY); setUser(null); return; }
      await supabase.auth.signOut();
    },
    mustSetPassword,
    async requestPasswordReset(email) {
      if (!supabase) {
        // Demo mode has no email: show the code on screen instead.
        const code = String(Math.floor(100000 + Math.random() * 900000));
        localStorage.setItem(DEMO_RESET_KEY, JSON.stringify({ email: email.toLowerCase(), code, expires: Date.now() + RESET_VALID_MS }));
        return { demoCode: code };
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      return {};
    },
    async verifyResetCode(email, code) {
      if (!supabase) {
        const saved = JSON.parse(localStorage.getItem(DEMO_RESET_KEY) || 'null');
        if (!saved || saved.email !== email.toLowerCase() || saved.code !== code || saved.expires < Date.now()) {
          throw new Error('Token has expired or is invalid');
        }
        localStorage.removeItem(DEMO_RESET_KEY);
        setMustSetPassword(true);
        demoLogin(email);
        return;
      }
      // Raise the flag before the session arrives, so the app never renders without the new-password screen.
      setMustSetPassword(true);
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (error) { setMustSetPassword(false); throw error; }
    },
    async updatePassword(password) {
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      setMustSetPassword(false);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
