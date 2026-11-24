import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const csp: string = vercel.headers[0].headers.find((h: { key: string }) => h.key === 'Content-Security-Policy').value;

describe('security headers', () => {
  it('allow the inline theme script in index.html (update the hash in vercel.json when it changes)', () => {
    const scripts = [...readFileSync('index.html', 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    for (const s of scripts) expect(csp).toContain(`'sha256-${createHash('sha256').update(s).digest('base64')}'`);
  });
  it('allow the Supabase project and nothing else to be called', () => {
    const url = readFileSync('.env.production', 'utf8').match(/VITE_SUPABASE_URL=(\S+)/)![1];
    expect(csp).toContain(`connect-src 'self' ${url} ${url.replace('https://', 'wss://')}`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
