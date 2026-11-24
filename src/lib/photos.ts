import { supabase } from './supabase';
import type { ProgressPhoto } from './types';
import { addMonths } from './utils';

const BUCKET = 'progress-photos';

/** A photo may be added once a month: the day after which the next one is allowed (null = now). */
export function nextPhotoDate(photos: ProgressPhoto[]) {
  const last = photos.reduce<string | null>((a, p) => (!a || p.date > a ? p.date : a), null);
  return last ? addMonths(last, 1) : null;
}

/** Shrinks a photo to at most `max` px on its long side as JPEG (phone photos are several MB). */
export async function compressImage(file: File, max = 1280, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('image'))), 'image/jpeg', quality));
}

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result as string);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

/** Stores the photo file and returns the path to keep on the row (demo mode: a small data: URL). */
export async function uploadPhoto(userId: string, id: string, file: File): Promise<string> {
  if (!supabase) return toDataUrl(await compressImage(file, 600, 0.7));
  const path = `${userId}/${id}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, await compressImage(file), { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(/bucket not found/i.test(error.message) ? 'מסד הנתונים עוד לא עודכן (update-10-progress-photos.sql)' : error.message);
  return path;
}

export async function deletePhotoFile(path: string) {
  if (supabase && !path.startsWith('data:')) await supabase.storage.from(BUCKET).remove([path]);
}

/** A temporary link (1 hour) to a private photo. */
export async function photoUrl(path: string): Promise<string | null> {
  if (!supabase || path.startsWith('data:')) return path;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Asks the server to compare this photo with the previous one (Claude); returns the explanation. */
export async function comparePhotos(photoId: string): Promise<string> {
  if (!supabase) throw new Error('בגרסת ההדגמה אין השוואה של Claude. באתר האמיתי ההשוואה מופיעה כאן.');
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/compare-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ photoId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body.analysis;
}
