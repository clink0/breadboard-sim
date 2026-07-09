import admin from 'firebase-admin';

// Lazy init (not at module load) so the server can still start and serve
// /toolchain-status even before FIREBASE_SERVICE_ACCOUNT_BASE64 is set -
// mirrors how routes/chat.js checks ANTHROPIC_API_KEY at request time
// rather than crashing at startup. See FIREBASE_SETUP.md for how to
// produce this env var from a downloaded service account JSON file.
let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set - see FIREBASE_SETUP.md.');
  }
  const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  initialized = true;
}

export function verifyIdToken(token) {
  ensureInitialized();
  return admin.auth().verifyIdToken(token);
}
