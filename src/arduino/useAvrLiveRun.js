import { useEffect, useRef } from 'react';
import { createAvrRuntime } from './avrRuntime';
import { useCircuitStore } from '../state/circuitStore';
import { resolveTopology } from '../breadboard/topology';
import { buildTransientElement, deriveCurrents } from '../sim/simulate';
import { arduinoPinElements, readbackArduinoPins } from '../sim/arduinoInterface';
import { createTransientStepper } from '../sim/transientStepper';

const CLOCK_HZ = 16_000_000; // Arduino Uno's crystal frequency
const MAX_CATCHUP_MS = 100; // cap the cycle jump after e.g. a backgrounded tab
const D12_BIT = 1 << 4; // D8-D13 = PB0-PB5
const D13_BIT = 1 << 5;

// Owns the avr8js runtime and a requestAnimationFrame loop entirely outside
// React state: LED updates go straight to the DOM via refs so the 60fps hot
// path never triggers a re-render. Only coarse state (compiled hex, running)
// comes from the caller/store. Lives in App.jsx (always mounted) rather than
// ArduinoView (which unmounts on tab switch) so a running sketch keeps
// driving the breadboard live while the user watches the Breadboard view.
export function useAvrLiveRun(hex, running) {
  const led12Ref = useRef(null);
  const led13Ref = useRef(null);
  const runtimeRef = useRef(null);
  const stepperRef = useRef(null);
  const lastHighMapRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    if (!hex) {
      runtimeRef.current = null;
      return;
    }
    const runtime = createAvrRuntime(hex);
    runtime.portB.addListener((value) => {
      led12Ref.current?.classList.toggle('led-lit', !!(value & D12_BIT));
      led13Ref.current?.classList.toggle('led-lit', !!(value & D13_BIT));
    });
    runtimeRef.current = runtime;
    stepperRef.current = createTransientStepper();
    lastHighMapRef.current = new Map();
    led12Ref.current?.classList.remove('led-lit');
    led13Ref.current?.classList.remove('led-lit');
  }, [hex]);

  useEffect(() => {
    if (!running || !runtimeRef.current) return undefined;

    lastTimeRef.current = performance.now();
    const loop = (now) => {
      const elapsedMs = Math.min(now - lastTimeRef.current, MAX_CATCHUP_MS);
      lastTimeRef.current = now;
      const runtime = runtimeRef.current;
      if (runtime) {
        const targetCycles = runtime.cpu.cycles + elapsedMs * (CLOCK_HZ / 1000);
        runtime.runCycles(targetCycles);

        // Once per frame (not per port-listener callback - a tight
        // bit-bang loop firing many times/frame wouldn't be visible at
        // human timescales anyway), co-simulate the breadboard circuit
        // with the CPU's current pin states.
        const { components, wires } = useCircuitStore.getState();
        const { resolve } = resolveTopology(wires);
        const elements = [
          ...components.map((c) => buildTransientElement(c, resolve)),
          ...arduinoPinElements(runtime, resolve),
        ];
        const groundNode = resolve('arduino-GND');
        const { voltages, converged, sourceCurrents } = stepperRef.current.step(
          elements,
          groundNode,
          elapsedMs / 1000,
          now / 1000,
        );
        readbackArduinoPins(runtime, voltages, resolve, lastHighMapRef.current);
        const { currents, deviceInfo } = deriveCurrents(elements, components, voltages, sourceCurrents);
        useCircuitStore.setState({
          simResult: { voltages, currents, deviceInfo, converged, nodeFor: resolve },
          running: true,
          liveSource: 'arduino',
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Only clear the breadboard's live state if we're the ones driving it
      // - avoids clobbering an unrelated DC "Simulate" session.
      if (useCircuitStore.getState().liveSource === 'arduino') {
        useCircuitStore.setState({ running: false, liveSource: null });
      }
    };
  }, [running]);

  return { led12Ref, led13Ref };
}
