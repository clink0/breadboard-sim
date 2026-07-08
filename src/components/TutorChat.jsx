import React, { useRef, useState, useEffect } from 'react';
import { useChatStore } from '../state/chatStore';

export default function TutorChat() {
  const messages = useChatStore((s) => s.messages);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const resetChat = useChatStore((s) => s.resetChat);

  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending, error]);

  const submit = () => {
    if (sending || !draft.trim()) return;
    sendMessage(draft);
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="tutor-chat">
      <div className="tutor-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="tutor-message tutor-message-assistant">
            Hi! I can see what's on your breadboard. Ask me anything about it - why a part behaves the way it does,
            what to try next, or whether something looks miswired.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`tutor-message tutor-message-${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="tutor-thinking">thinking&hellip;</div>}
        {error && <div className="tutor-error">{error}</div>}
      </div>

      <div className="tutor-input-row">
        <textarea
          className="tutor-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your circuit..."
          rows={2}
        />
        <button className="run-button" onClick={submit} disabled={sending || !draft.trim()}>Send</button>
      </div>
      {messages.length > 0 && (
        <button className="tutor-reset" onClick={resetChat}>New conversation</button>
      )}
    </div>
  );
}
