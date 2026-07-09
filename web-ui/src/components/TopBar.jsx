import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import BrandMenu from './BrandMenu';
import AuthWidget from './AuthWidget';

export default function TopBar() {
  const page = useCircuitStore((s) => s.page);
  const view = useCircuitStore((s) => s.view);
  const setView = useCircuitStore((s) => s.setView);
  const running = useCircuitStore((s) => s.running);
  const liveSource = useCircuitStore((s) => s.liveSource);
  const runSimulation = useCircuitStore((s) => s.runSimulation);
  const stopSimulation = useCircuitStore((s) => s.stopSimulation);
  const reset = useCircuitStore((s) => s.reset);
  const converged = useCircuitStore((s) => s.simResult.converged);

  return (
    <header className="top-bar">
      <BrandMenu />

      <div className="top-bar-center">
        {page === 'workspace' && (
          <>
            <div className="view-toggle">
              <button className={`view-toggle-button ${view === 'breadboard' ? 'is-active' : ''}`} onClick={() => setView('breadboard')}>
                Breadboard
              </button>
              <button className={`view-toggle-button ${view === 'arduino' ? 'is-active' : ''}`} onClick={() => setView('arduino')}>
                Arduino IDE
              </button>
            </div>
            {view === 'breadboard' && running && !converged && (
              <span className="convergence-warning" title="The solver hit its iteration limit without settling - voltages/currents shown may not be accurate.">
                ⚠ did not converge
              </span>
            )}
            {view === 'breadboard' && liveSource === 'arduino' && (
              <span className="convergence-warning">Arduino is driving this circuit live</span>
            )}
          </>
        )}
      </div>

      <div className="top-bar-right">
        {page === 'workspace' && view === 'breadboard' && (
          <div className="top-bar-actions">
            {liveSource !== 'arduino' && (!running ? (
              <button className="run-button" onClick={runSimulation}>Simulate</button>
            ) : (
              <button className="run-button is-running" onClick={stopSimulation}>Stop</button>
            ))}
            <button className="reset-button" onClick={reset}>Reset board</button>
          </div>
        )}
        <AuthWidget />
      </div>
    </header>
  );
}
