import React, { useEffect } from 'react';
import CodeEditor from './CodeEditor';
import LedIndicators from './LedIndicators';
import { useArduinoStore } from '../state/arduinoStore';

// Note: the live avr8js run loop (useAvrLiveRun) is owned by App.jsx, not
// here - it must stay mounted while the user switches to the Breadboard
// view to watch a wired circuit react live, so this component only
// receives the LED refs it needs to render, rather than owning the hook.
export default function ArduinoView({ led12Ref, led13Ref }) {
  const sketch = useArduinoStore((s) => s.sketch);
  const setSketch = useArduinoStore((s) => s.setSketch);
  const compile = useArduinoStore((s) => s.compile);
  const compileStatus = useArduinoStore((s) => s.compileStatus);
  const hex = useArduinoStore((s) => s.hex);
  const compileOutput = useArduinoStore((s) => s.compileOutput);
  const toolchain = useArduinoStore((s) => s.toolchain);
  const running = useArduinoStore((s) => s.running);
  const setRunning = useArduinoStore((s) => s.setRunning);
  const fetchToolchainStatus = useArduinoStore((s) => s.fetchToolchainStatus);

  useEffect(() => {
    fetchToolchainStatus();
  }, [fetchToolchainStatus]);

  return (
    <div className="arduino-view">
      <div className="arduino-toolbar">
        <button className="run-button" onClick={compile} disabled={compileStatus === 'compiling'}>
          {compileStatus === 'compiling' ? 'Compiling…' : 'Compile'}
        </button>
        {!running ? (
          <button className="run-button" onClick={() => setRunning(true)} disabled={!hex}>Run</button>
        ) : (
          <button className="run-button is-running" onClick={() => setRunning(false)}>Stop</button>
        )}
        <LedIndicators led12Ref={led12Ref} led13Ref={led13Ref} />
      </div>

      {toolchain && !toolchain.ready && (
        <div className="toolchain-banner">
          <span className="convergence-warning">⚠ Arduino toolchain not ready</span>
          <ul>
            {toolchain.instructions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="arduino-body">
        <div className="arduino-editor">
          <CodeEditor value={sketch} onChange={setSketch} />
        </div>
        <div className="arduino-output-panel">
          <h3 className="panel-subtitle">Compiler Output</h3>
          <pre className={`compiler-output ${compileStatus === 'error' ? 'has-error' : ''}`}>
            {compileOutput.stderr || compileOutput.stdout || 'No output yet - click Compile.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
