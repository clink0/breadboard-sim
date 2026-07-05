import React from 'react';
import { useCircuitStore } from '../state/circuitStore';

export default function TopBar() {
  const running = useCircuitStore((s) => s.running);
  const runSimulation = useCircuitStore((s) => s.runSimulation);
  const stopSimulation = useCircuitStore((s) => s.stopSimulation);
  const reset = useCircuitStore((s) => s.reset);

  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark">◍</span>
        <span>Breadboard Sim</span>
      </div>
      <div className="top-bar-actions">
        {!running ? (
          <button className="run-button" onClick={runSimulation}>Simulate</button>
        ) : (
          <button className="run-button is-running" onClick={stopSimulation}>Stop</button>
        )}
        <button className="reset-button" onClick={reset}>Reset board</button>
      </div>
    </header>
  );
}
