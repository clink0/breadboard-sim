import React from 'react';
import { useCircuitStore } from './state/circuitStore';
import { useArduinoStore } from './state/arduinoStore';
import { useAvrLiveRun } from './arduino/useAvrLiveRun';
import TopBar from './components/TopBar';
import Palette from './components/Palette';
import Breadboard from './components/Breadboard';
import Inspector from './components/Inspector';
import Oscilloscope from './components/Oscilloscope';
import ArduinoView from './components/ArduinoView';
import PanZoomCanvas from './components/PanZoomCanvas';

export default function App() {
  const view = useCircuitStore((s) => s.view);
  const hex = useArduinoStore((s) => s.hex);
  const running = useArduinoStore((s) => s.running);
  // Always mounted (not inside ArduinoView) so a running sketch keeps
  // driving the breadboard live even while the user is looking at it.
  const { led12Ref, led13Ref } = useAvrLiveRun(hex, running);

  return (
    <div className="app-shell">
      <TopBar />
      {view === 'breadboard' ? (
        <div className="app-body">
          <Palette />
          <main className="board-stage">
            <div className="board-scroll">
              <PanZoomCanvas>
                <Breadboard />
              </PanZoomCanvas>
            </div>
            <Oscilloscope />
          </main>
          <Inspector />
        </div>
      ) : (
        <ArduinoView led12Ref={led12Ref} led13Ref={led13Ref} />
      )}
    </div>
  );
}
