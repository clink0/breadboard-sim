import { describe, it, expect, beforeEach } from 'vitest';
import { useCircuitStore } from './circuitStore';

beforeEach(() => {
  useCircuitStore.getState().reset();
  useCircuitStore.setState({ shortWarning: null, tool: 'wire', pendingHoles: [] });
});

describe('circuitStore.clickHole - self-short guardrail', () => {
  it('blocks a component placement that would short its own leads and sets shortWarning', () => {
    const { setTool, clickHole } = useCircuitStore.getState();
    setTool('resistor');
    clickHole('c-1');
    clickHole('d-1'); // same column as c-1 -> same node -> shorted

    const state = useCircuitStore.getState();
    expect(state.components).toHaveLength(0);
    expect(state.pendingHoles).toEqual([]);
    expect(state.shortWarning).not.toBeNull();
    expect(state.shortWarning.type).toBe('resistor');
    expect(state.shortWarning.holes).toEqual({ a: 'c-1', b: 'd-1' });
    expect(state.shortWarning.problems.length).toBeGreaterThan(0);
  });

  it('still places a component whose leads land on different nodes', () => {
    const { setTool, clickHole } = useCircuitStore.getState();
    setTool('resistor');
    clickHole('c-1');
    clickHole('c-2'); // different column -> different node -> fine

    const state = useCircuitStore.getState();
    expect(state.components).toHaveLength(1);
    expect(state.components[0].type).toBe('resistor');
    expect(state.shortWarning).toBeNull();
  });

  it('does not apply the guardrail to wires', () => {
    const { setTool, clickHole } = useCircuitStore.getState();
    setTool('wire');
    clickHole('c-1');
    clickHole('d-1'); // redundant wire within the same node, but not a "shorted component"

    const state = useCircuitStore.getState();
    expect(state.wires).toHaveLength(1);
    expect(state.shortWarning).toBeNull();
  });

  it('dismissShortWarning clears the warning', () => {
    const { setTool, clickHole, dismissShortWarning } = useCircuitStore.getState();
    setTool('resistor');
    clickHole('c-1');
    clickHole('d-1');
    expect(useCircuitStore.getState().shortWarning).not.toBeNull();

    dismissShortWarning();
    expect(useCircuitStore.getState().shortWarning).toBeNull();
  });
});

describe('circuitStore.page', () => {
  it('defaults to workspace', () => {
    expect(useCircuitStore.getState().page).toBe('workspace');
  });

  it('setPage switches the top-level page', () => {
    useCircuitStore.getState().setPage('tutorials');
    expect(useCircuitStore.getState().page).toBe('tutorials');
    useCircuitStore.getState().setPage('workspace');
    expect(useCircuitStore.getState().page).toBe('workspace');
  });
});
