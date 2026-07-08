import express from 'express';
import { compileRouter } from './routes/compile.js';
import { toolchainStatusRouter } from './routes/toolchainStatus.js';
import { chatRouter } from './routes/chat.js';

// No-op if .env doesn't exist yet - the compile server should keep working
// even before an ANTHROPIC_API_KEY is configured.
try { process.loadEnvFile(); } catch { /* no .env file present */ }

const PORT = 3001;

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(compileRouter);
app.use(toolchainStatusRouter);
app.use(chatRouter);

// Loopback-only: this endpoint shells out to a real compiler on
// user-supplied source, so it should never be reachable off this machine.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Arduino compile server listening on http://127.0.0.1:${PORT}`);
});
