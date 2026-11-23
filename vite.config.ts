import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** One id per build: the service worker is registered with it, so each deploy refreshes the offline copy. */
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || String(Date.now());

/** Writes precache-manifest.json: every built file the service worker keeps for offline use. */
function precacheManifest(): Plugin {
  return {
    name: 'fitlogix-precache-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => f.startsWith('assets/')).map((f) => '/' + f);
      this.emitFile({ type: 'asset', fileName: 'precache-manifest.json', source: JSON.stringify({ version: BUILD_ID, files }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), precacheManifest()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
});
