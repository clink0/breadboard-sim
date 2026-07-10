import React from 'react';
import { useCircuitStore } from '../state/circuitStore';

// A plain list so adding a future page (e.g. Preferences) is a one-line
// addition here, not a redesign of the menu itself.
const PAGES = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'tutorials', label: 'Tutorials' },
  { id: 'profile', label: 'Profile' },
];

// Pure CSS :hover reveal (see .brand-menu/.brand-dropdown in global.css) -
// no open/close React state and no outside-click handling needed for a
// hover menu, which keeps this simple and avoids a class of dismiss bugs.
export default function BrandMenu() {
  const page = useCircuitStore((s) => s.page);
  const setPage = useCircuitStore((s) => s.setPage);

  return (
    <div className="brand-menu">
      <div className="brand">
        <span className="brand-mark">◍</span>
        <span>Breadboard Sim</span>
      </div>
      <div className="brand-dropdown">
        {PAGES.map((p) => (
          <button
            key={p.id}
            className={`brand-dropdown-item ${page === p.id ? 'is-active' : ''}`}
            onClick={() => setPage(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
