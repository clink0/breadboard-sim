import { Router } from 'express';
import { compileSketch, getToolchainStatus } from '../lib/arduinoCli.js';
import { requireAuth } from '../lib/requireAuth.js';
import { createRateLimiter } from '../lib/rateLimit.js';

const MAX_SOURCE_BYTES = 200 * 1024;

export const compileRouter = Router();

const compileRateLimiter = createRateLimiter({
  windowMinutes: 15,
  max: 20,
  message: 'Too many compile requests - try again in a few minutes.',
});

// Gated: this shells out to a real compiler process on arbitrary user input,
// so it requires sign-in and is rate-limited per account. Middleware is
// attached directly to this route (not via compileRouter.use(...)) since
// this router is mounted at the app root alongside toolchainStatusRouter -
// a router-level .use() with no path would run for every request that
// reaches this router, not just /compile.
compileRouter.post('/compile', requireAuth, compileRateLimiter, async (req, res) => {
  const { source, fqbn } = req.body ?? {};

  if (typeof source !== 'string' || source.trim() === '') {
    return res.status(400).json({ success: false, error: 'invalid-request', message: 'source is required' });
  }
  if (Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) {
    return res.status(400).json({ success: false, error: 'invalid-request', message: 'source exceeds 200KB limit' });
  }

  const toolchain = await getToolchainStatus();
  if (!toolchain.ready) {
    return res.status(503).json({
      success: false,
      error: 'toolchain-not-ready',
      message: 'arduino-cli or the arduino:avr core is not installed.',
      toolchain,
    });
  }

  try {
    const result = await compileSketch({ source, fqbn });
    res.status(200).json(result);
  } catch (err) {
    console.error('Unexpected compile server error:', err);
    res.status(500).json({ success: false, error: 'internal-error', message: 'The compile server hit an unexpected error.' });
  }
});
