import React from 'react';
import { useTutorialStore } from '../state/tutorialStore';

// Pure CSS :hover/:focus-within reveal, same technique as BrandMenu (see
// .brand-menu/.brand-dropdown in global.css) - no open/close React state,
// and :focus-within means tabbing to the icon reveals it too.
export default function InfoTooltip({ blurb, tutorialId }) {
  const startTutorial = useTutorialStore((s) => s.startTutorial);

  if (!blurb) return null;

  return (
    <div className="info-tooltip">
      <button type="button" className="info-tooltip-icon" aria-label="Component info">
        i
      </button>
      <div className="info-tooltip-popover">
        <p>{blurb}</p>
        {tutorialId && (
          <button
            type="button"
            className="info-tooltip-example"
            onClick={() => startTutorial(tutorialId)}
          >
            See example circuit →
          </button>
        )}
      </div>
    </div>
  );
}
