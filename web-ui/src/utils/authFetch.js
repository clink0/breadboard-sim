import { auth } from '../firebase';

// Attaches a fresh Firebase ID token to a fetch call, if signed in. Used by
// the two backend-cost endpoints (/api/chat, /api/compile) - the backend
// verifies this token (backend/lib/requireAuth.js) and rejects requests
// without one.
export async function getAuthHeaders() {
  if (!auth.currentUser) return {};
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}
