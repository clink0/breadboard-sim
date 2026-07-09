import express from 'express';
import cors from 'cors';
import { compileRouter } from './routes/compile.js';
import { toolchainStatusRouter } from './routes/toolchainStatus.js';
import { chatRouter } from './routes/chat.js';

// The app has always used a single .env at the repo root (see
// FIREBASE_SETUP.md) - process.loadEnvFile() with no args resolves relative
// to CWD, which is this workspace's own folder when npm runs `backend`'s
// scripts, not the repo root. Resolve explicitly so it's correct regardless
// of invoking CWD. No-op (caught) on a hosted platform, where env vars are
// injected directly and no .env file exists at all.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch { /* no .env file present */ }

const PORT = process.env.PORT || 3001;
// Comma-separated list of allowed origins, e.g. "https://your-app.vercel.app".
// Defaults to allowing everything, which is fine for local dev (no browser
// enforces CORS against localhost-to-localhost anyway) but should always be
// set explicitly once this is actually hosted.
const CORS_ORIGIN = process.env.CORS_ORIGIN;

const app = express();
app.use(cors({ origin: CORS_ORIGIN ? CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));
app.use(compileRouter);
app.use(toolchainStatusRouter);
app.use(chatRouter);

// Bind 0.0.0.0 (not 127.0.0.1) so this is reachable once hosted, not just
// from the same machine - see DEPLOYMENT.md for the production posture
// (CORS_ORIGIN locked to the real frontend URL, /compile still has no
// rate limiting/auth yet, flagged there as a near-term follow-up).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});
