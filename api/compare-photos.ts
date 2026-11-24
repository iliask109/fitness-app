import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { adminClient, requireEnv } from './_shared.js';

export const config = { maxDuration: 120 };

const BUCKET = 'progress-photos';
const GOALS: Record<string, string> = { bulk: 'building muscle (mass)', cut: 'losing weight / fat', maintain: 'maintaining weight and fitness' };

const SYSTEM = `You are a supportive fitness coach inside a Hebrew fitness app.
The user uploads one progress photo a month. You get their previous photo and their new one, plus their body-weight data and goal.
Write in Hebrew, plain and warm, addressed to the user directly (use the gender given; if unknown, use neutral wording).
Describe only changes you can actually see (e.g. waist, shoulders, arms, muscle definition, posture), and say plainly when a change is too small to see or when different lighting, angle, clothing or distance make the photos hard to compare.
Connect what you see to the weight change this month and to the goal. Do not guess body-fat percentages or give medical advice, and never comment on attractiveness.
If either image is not a body/progress photo, say so briefly and do not analyse it.
Format: 3 to 6 short sentences of comparison, then a line starting with "💡" with one or two practical tips for next month. No headings, no markdown.`;

/** Compares the user's newest progress photo with the previous one and saves Claude's explanation on the photo. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    const db = adminClient();
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'not signed in' });
    const photoId = String((req.body as { photoId?: string } | undefined)?.photoId ?? '');

    // Everything is read with the user's id, so a user can only ever compare their own photos.
    const { data: photos, error: pErr } = await db.from('progress_photos').select('*').eq('user_id', user.id).order('date');
    if (pErr) return res.status(500).json({ error: 'קריאת התמונות נכשלה: ' + pErr.message });
    const i = (photos ?? []).findIndex((p) => p.id === photoId);
    if (i < 0) return res.status(404).json({ error: 'התמונה לא נמצאה' });
    const photo = photos![i];
    if (photo.analysis) return res.status(200).json({ analysis: photo.analysis });
    const prev = photos![i - 1];
    if (!prev) return res.status(400).json({ error: 'אין עדיין תמונה קודמת להשוואה' });

    const [{ data: profile }, { data: weights }] = await Promise.all([
      db.from('profiles').select('gender, fitness_goal, weight_goal, height_cm').eq('user_id', user.id).maybeSingle(),
      db.from('body_weights').select('date, weight').eq('user_id', user.id).order('date'),
    ]);
    const weightOn = (date: string, fallback: unknown) => {
      if (fallback != null) return Number(fallback);
      const before = (weights ?? []).filter((w) => w.date <= date);
      return before.length ? Number(before[before.length - 1].weight) : null;
    };
    const w0 = weightOn(prev.date, prev.weight), w1 = weightOn(photo.date, photo.weight);

    const image = async (path: string): Promise<Anthropic.Beta.BetaImageBlockParam> => {
      const { data, error: dErr } = await db.storage.from(BUCKET).download(path);
      if (dErr || !data) throw new Error('הורדת התמונה נכשלה: ' + (dErr?.message ?? path));
      const type = data.type === 'image/png' ? 'image/png' : data.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      return { type: 'image', source: { type: 'base64', media_type: type, data: Buffer.from(await data.arrayBuffer()).toString('base64') } };
    };
    const [before, after] = await Promise.all([image(prev.path), image(photo.path)]);

    const facts = [
      `Gender: ${profile?.gender ?? 'unknown'}`,
      `Goal: ${GOALS[profile?.fitness_goal ?? ''] ?? 'not set'}${profile?.weight_goal ? `, target weight ${profile.weight_goal} kg` : ''}`,
      profile?.height_cm ? `Height: ${profile.height_cm} cm` : null,
      `Previous photo: ${prev.date}${w0 != null ? `, weight ${w0} kg` : ''}`,
      `New photo: ${photo.date}${w1 != null ? `, weight ${w1} kg` : ''}`,
      w0 != null && w1 != null ? `Weight change between the photos: ${(w1 - w0 > 0 ? '+' : '') + (Math.round((w1 - w0) * 10) / 10)} kg` : 'Weight change: unknown',
    ].filter(Boolean).join('\n');

    const client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
    const msg = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      output_config: { effort: 'medium' },
      // If the model declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Previous photo:' }, before,
          { type: 'text', text: 'New photo:' }, after,
          { type: 'text', text: facts },
        ],
      }],
    });
    if (msg.stop_reason === 'refusal') return res.status(422).json({ error: 'לא ניתן היה לנתח את התמונות האלה. נסה תמונה אחרת.' });
    const analysis = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
    if (!analysis) return res.status(502).json({ error: 'לא התקבלה תשובה, נסה שוב' });

    await db.from('progress_photos').update({ analysis, compared_to: prev.id }).eq('id', photo.id).eq('user_id', user.id);
    return res.status(200).json({ analysis });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: 'מפתח ה-API של Claude ב-Vercel לא תקין (ANTHROPIC_API_KEY).' });
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'יותר מדי בקשות כרגע, נסה שוב בעוד דקה.' });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: `שגיאה מ-Claude (${err.status}). נסה שוב מאוחר יותר.` });
    return res.status(500).json({ error: (err as Error).message });
  }
}
