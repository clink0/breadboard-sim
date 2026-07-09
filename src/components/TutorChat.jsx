import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../state/chatStore';

// react-markdown renders straight to React elements (no dangerouslySetInnerHTML,
// no raw-HTML passthrough unless rehype-raw is added - which it isn't), so
// this is safe against a malicious/compromised API response injecting markup.
function MarkdownMessage({ content }) {
  return (
    <div className="tutor-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

// Shown under an assistant message that actually changed the board/sketch
// (see chatStore.js's applyActions) so the student sees at a glance that
// something landed, not just that the tutor talked about it.
function AppliedBadges({ applied }) {
  if (!applied) return null;
  return (
    <div className="preset-row">
      {applied.components > 0 && <span className="preset-chip is-active">+{applied.components} component{applied.components === 1 ? '' : 's'}</span>}
      {applied.wires > 0 && <span className="preset-chip is-active">+{applied.wires} wire{applied.wires === 1 ? '' : 's'}</span>}
      {applied.sketch && <span className="preset-chip is-active">updated code</span>}
    </div>
  );
}

function buildFixPrompt(problems) {
  return `The circuit you just tried to build was invalid, so nothing was placed: ${problems.join(' ')} Please redo it - remember node identity depends only on the column number, not the row, so every terminal of a component needs to land in a different column unless you intend to join it to an existing node. Use the modify_circuit tool again.`;
}

// Shown when the AI's proposed components/wires were withheld because they'd
// short something out (see chatStore.js's applyActions / detectShorts.js).
// Gives the student a one-click way to hand the specific problem back to
// the model rather than having to describe the mistake themselves.
function CircuitProblems({ problems, onFix, disabled }) {
  if (!problems) return null;
  return (
    <div className="tutor-circuit-error">
      <div className="tutor-circuit-error-title">Nothing was placed - that circuit would have been wired wrong:</div>
      <ul>
        {problems.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <button className="reset-button" onClick={onFix} disabled={disabled}>Ask AI to fix this</button>
    </div>
  );
}

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
            <MarkdownMessage content={m.content} />
            <AppliedBadges applied={m.applied} />
            <CircuitProblems problems={m.problems} disabled={sending} onFix={() => sendMessage(buildFixPrompt(m.problems))} />
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
