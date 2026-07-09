import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Keyed by the authenticated user's uid (requireAuth must run first in the
// middleware chain) rather than IP - meaningful now that these routes
// require sign-in, and avoids punishing everyone behind a shared IP/NAT for
// one account's usage. The req.ip fallback (unauthenticated requests never
// reach here today, but keep this correct regardless) goes through
// ipKeyGenerator() to normalize IPv6 addresses per-subnet rather than
// per-address - express-rate-limit validates this at startup and logs a
// ValidationError if a raw req.ip is used instead.
export function createRateLimiter({ windowMinutes, max, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.uid ?? ipKeyGenerator(req.ip),
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: 'rate-limited', message });
    },
  });
}
