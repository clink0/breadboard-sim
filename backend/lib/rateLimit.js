import rateLimit from 'express-rate-limit';

// Keyed by the authenticated user's uid (requireAuth must run first in the
// middleware chain) rather than IP - meaningful now that these routes
// require sign-in, and avoids punishing everyone behind a shared IP/NAT for
// one account's usage.
export function createRateLimiter({ windowMinutes, max, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.uid ?? req.ip,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: 'rate-limited', message });
    },
  });
}
