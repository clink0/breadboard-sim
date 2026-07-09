import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../state/authStore';
import SignInModal from './SignInModal';

// Global sign-in status, not workspace-specific - lives in TopBar outside
// the `page === 'workspace'` gate.
export default function AuthWidget() {
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const signOutUser = useAuthStore((s) => s.signOutUser);
  const [showModal, setShowModal] = useState(false);

  // Auto-close the modal once sign-in actually succeeds.
  useEffect(() => {
    if (user) setShowModal(false);
  }, [user]);

  if (initializing) return null;

  return (
    <div className="auth-widget">
      {user ? (
        <>
          <span className="auth-widget-email">{user.email}</span>
          <button className="reset-button" onClick={signOutUser}>Sign out</button>
        </>
      ) : (
        <button className="reset-button" onClick={() => setShowModal(true)}>Sign in</button>
      )}
      {showModal && <SignInModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
