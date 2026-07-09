import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Modular API (firebase-admin/app, firebase-admin/auth), not the legacy
// `import admin from 'firebase-admin'; admin.credential.cert(...)` style -
// under this package's "type": "module", that default import doesn't
// reliably expose the admin namespace (admin.credential ends up undefined:
// "Cannot read properties of undefined (reading 'cert')"), a known
// ESM-interop gap with firebase-admin's legacy entry point. The modular
// imports are firebase-admin's own documented ESM path and sidestep it.
//
// Lazy init (not at module load) so the server can still start and serve
// /toolchain-status even before FIREBASE_SERVICE_ACCOUNT_BASE64 is set -
// mirrors how routes/chat.js checks ANTHROPIC_API_KEY at request time
// rather than crashing at startup. See FIREBASE_SETUP.md for how to
// produce this env var from a downloaded service account JSON file.
let auth = null;

function ensureInitialized() {
  if (auth) return auth;
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set - see FIREBASE_SETUP.md.');
  }
  const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  const app = initializeApp({ credential: cert(serviceAccount) });
  auth = getAuth(app);
  return auth;
}

export function verifyIdToken(token) {
  return ensureInitialized().verifyIdToken(token);
}
