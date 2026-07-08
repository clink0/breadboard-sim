import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import monacoEditorPluginModule from 'vite-plugin-monaco-editor';

// CJS/ESM interop: the plugin ships as a CJS `exports.default`, which Vite's
// ESM config loader surfaces as `.default` rather than the bare import.
const monacoEditorPlugin = monacoEditorPluginModule.default ?? monacoEditorPluginModule;

export default defineConfig({
  plugins: [react(), monacoEditorPlugin({ languageWorkers: ['typescript', 'json'] })],
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
