import React, { useState } from 'react';
import { useAuthStore } from '../state/authStore';

// Reuses the .modal/.modal-backdrop pattern from ShortPlacementWarning.jsx
// rather than inventing new modal styling.
export default function SignInModal({ onClose }) {
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const error = useAuthStore((s) => s.error);

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim() || submitting) return;
    setSubmitting(true);
    if (mode === 'signin') await signInWithEmail(email, password);
    else await signUpWithEmail(email, password);
    setSubmitting(false);
  };

  const google = async () => {
    setSubmitting(true);
    await signInWithGoogle();
    setSubmitting(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{mode === 'signin' ? 'Sign in' : 'Create an account'}</h3>
        <p className="modal-body">
          Signing in lets you use the AI Tutor and Arduino Compile - the rest of the simulator is always free to use.
        </p>

        <button className="reset-button" onClick={google} disabled={submitting} style={{ width: '100%', marginBottom: 10 }}>
          Sign in with Google
        </button>

        <input
          className="tutorial-text-input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <input
          className="tutorial-text-input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        {error && <div className="tutor-error">{error}</div>}

        <div className="modal-actions">
          <button
            className="tutor-reset"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? "Need an account? Sign up" : 'Have an account? Sign in'}
          </button>
          <button className="run-button" onClick={submit} disabled={submitting || !email.trim() || !password.trim()}>
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
}
