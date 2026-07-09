import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Monaco's worker (src/components/CodeEditor.jsx) is wired up via Vite's
  // native `?worker` import instead of vite-plugin-monaco-editor - that
  // plugin predates monaco-editor's package.json "exports" map and
  // require.resolve()s worker files without a .js extension, which only
  // ever worked under Node's legacy (non-exports) extension-guessing.
  // Under a real `vite build` (its writeBundle hook, never exercised by
  // `vite dev`) that now hard-fails: "Cannot find module
  // '.../monaco-editor/esm/vs/language/typescript/ts.worker'". We also
  // don't need that plugin's typescript/json language workers anyway -
  // this editor only ever uses the `cpp` language with custom-registered
  // completion/hover providers (see CodeEditor.jsx), which run on the main
  // thread and don't need a language-service worker at all.
  worker: { format: 'es' },
  // This workspace lives at <repo root>/web-ui, but the single .env the app
  // has always used (see FIREBASE_SETUP.md) lives at the repo root - point
  // Vite there instead of its default (same dir as this config file), so
  // VITE_* vars keep loading from the same place they always have.
  envDir: path.resolve(__dirname, '..'),
  server: {
    proxy: {
      // No path rewrite - backend/index.js mounts its routes under /api too,
      // so /api/chat here forwards straight to /api/chat there. Keeping dev
      // and prod (VITE_API_BASE_URL pointed directly at a hosted backend,
      // no proxy involved) hitting the exact same paths is the point - a
      // rewrite here would only work in dev and silently 404 in prod, which
      // is exactly the bug this replaced.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
  },
});
