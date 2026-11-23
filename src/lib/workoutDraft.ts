import type { Workout } from './types';

/**
 * An unfinished new workout, kept on this device so it survives leaving the page, closing the app
 * or the phone turning off. It can be resumed for an hour after the last change.
 */
export interface WorkoutDraft {
  workout: Workout;
  /** When the workout started (for its duration). */
  startedAt: number;
  /** Last change; the draft expires DRAFT_TTL_MS after this. */
  updatedAt: number;
}

export const DRAFT_TTL_MS = 60 * 60 * 1000;
const key = (userId: string) => `fitlogix:workout-draft:${userId}`;

export function loadDraft(userId: string, now = Date.now()): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const d = JSON.parse(raw) as WorkoutDraft;
    if (now - d.updatedAt > DRAFT_TTL_MS) { localStorage.removeItem(key(userId)); return null; }
    return d;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, draft: WorkoutDraft) {
  try { localStorage.setItem(key(userId), JSON.stringify(draft)); } catch { /* storage full or blocked */ }
}

export function clearDraft(userId: string) {
  try { localStorage.removeItem(key(userId)); } catch { /* ignore */ }
}

/** Only worth keeping once at least one set was marked done. */
export const hasProgress = (w: Workout) => w.exercises.some((e) => e.sets.some((s) => s.done));

export function draftProgress(w: Workout) {
  const done = w.exercises.filter((e) => e.sets.length && e.sets.every((s) => s.done)).length;
  const sets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  return { done, total: w.exercises.length, sets };
}
