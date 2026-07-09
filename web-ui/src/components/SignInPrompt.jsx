import React, { useState } from 'react';
import SignInModal from './SignInModal';

// Small reusable "sign in to use this" prompt for the two backend-cost
// features (AI Tutor, Arduino Compile) - see TutorChat.jsx/ArduinoView.jsx.
export default function SignInPrompt({ message }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="sign-in-prompt">
      <p className="empty-hint">{message}</p>
      <button className="run-button" onClick={() => setShowModal(true)}>Sign in</button>
      {showModal && <SignInModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
