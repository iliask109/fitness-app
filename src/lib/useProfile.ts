import { useAuth } from './auth';
import { useTable } from './useTable';
import { DEFAULT_PROFILE, Profile } from './types';

export function useProfile() {
  const { user } = useAuth();
  const t = useTable<Profile>('profiles');
  const profile: Profile = { ...DEFAULT_PROFILE, ...t.rows[0], id: t.rows[0]?.id ?? user!.id };
  return { profile, loading: t.loading, save: (p: Partial<Profile>) => t.save({ ...profile, ...p }) };
}
