import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import monacoEditorPluginModule from 'vite-plugin-monaco-editor';

// CJS/ESM interop: the plugin ships as a CJS `exports.default`, which Vite's
// ESM config loader surfaces as `.default` rather than the bare import.
const monacoEditorPlugin = monacoEditorPluginModule.default ?? monacoEditorPluginModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), monacoEditorPlugin({ languageWorkers: ['typescript', 'json'] })],
  // This workspace lives at <repo root>/web-ui, but the single .env the app
  // has always used (see FIREBASE_SETUP.md) lives at the repo root - point
  // Vite there instead of its default (same dir as this config file), so
  // VITE_* vars keep loading from the same place they always have.
  envDir: path.resolve(__dirname, '..'),
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
