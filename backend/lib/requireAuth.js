import { verifyIdToken } from './firebaseAdmin.js';

// Express middleware requiring a valid Firebase ID token. Applied to
// compileRouter/chatRouter only (see those files) - both cost real
// resources per request (a real compiler process, a paid Anthropic call),
// so both need gating now that the backend is publicly hosted, not just
// /compile as originally scoped. Attaches req.user = { uid, email } for
// the rate limiter (keyed by uid) to use downstream.
export async function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, error: 'unauthorized', message: 'Sign in required.' });
  }

  try {
    const decoded = await verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    if (err.message?.includes('FIREBASE_SERVICE_ACCOUNT_BASE64')) {
      console.error(err.message);
      return res.status(503).json({ success: false, error: 'auth-not-configured', message: 'Server auth is not configured yet.' });
    }
    res.status(401).json({ success: false, error: 'unauthorized', message: 'Sign in required.' });
  }
}
