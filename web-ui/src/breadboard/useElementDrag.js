import { useCallback, useRef, useState } from 'react';
import { COLS } from './layout';
import { useCircuitStore } from '../state/circuitStore';
import { findShortedComponents } from '../utils/detectShorts';

const DRAG_THRESHOLD = 3; // px of local-space movement before a mousedown counts as a drag, not a click

export const holeRow = (holeId) => holeId.slice(0, holeId.lastIndexOf('-'));
export const holeCol = (holeId) => Number(holeId.slice(holeId.lastIndexOf('-') + 1));

// Converts a mouse event's viewport coordinates into the same local
// coordinate space the `holes` array's x/y live in, using the board group
// element's own screen transform - correct regardless of the PanZoomCanvas
// wrapper's current pan/zoom, no dependency on its internal state.
function localPoint(groupEl, clientX, clientY) {
  const ctm = groupEl.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const pt = groupEl.ownerSVGElement.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

export function nearestHole(holes, x, y, { excludeArduino = false } = {}) {
  let best = null;
  let bestDist = Infinity;
  for (const h of holes) {
    if (excludeArduino && h.row === 'arduino') continue;
    const dx = h.x - x;
    const dy = h.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = h;
    }
  }
  return best;
}

// Pure column-delta math shared by the live drag preview and its unit tests:
// shifts every terminal in `holeEntries` (an array of [name, holeId] pairs)
// by the same column offset (targetCol - the anchor terminal's own column),
// keeping each terminal's row unchanged. Returns null if any resulting
// column would fall outside the board (1..COLS) - the caller should treat
// that as "ignore this move, keep the last valid ghost."
export function computeComponentMove(holeEntries, anchorId, targetCol) {
  const delta = targetCol - holeCol(anchorId);
  const newHoles = {};
  for (const [name, id] of holeEntries) {
    const col = holeCol(id) + delta;
    if (col < 1 || col > COLS) return null;
    newHoles[name] = `${holeRow(id)}-${col}`;
  }
  return newHoles;
}

// Drag interaction for repositioning placed components/wires on the board.
// Ghost/session state is local to this hook (ephemeral UI state, not app
// data) - only the final, validated drop is committed to circuitStore.
//
// Components translate by a single column offset, keeping each terminal's
// original row (row never affects node identity, see topology.js), and are
// only draggable when none of their terminals sit on an Arduino hole - those
// have no column to offset by. Wires drag per-endpoint instead, since a wire
// has no shape to preserve; either end can land anywhere, Arduino included.
export function useElementDrag({ holes, groupRef }) {
  const [ghost, setGhost] = useState(null);
  const sessionRef = useRef(null);

  const cleanup = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      window.removeEventListener('mousemove', session.onMove);
      window.removeEventListener('mouseup', session.onUp);
    }
    sessionRef.current = null;
    setGhost(null);
  }, []);

  const onComponentMouseDown = useCallback((component, e) => {
    if (e.button !== 0) return; // left-click only, matches PanZoomCanvas leaving left-click free
    const holeEntries = Object.entries(component.holes);
    if (holeEntries.some(([, id]) => id.startsWith('arduino-'))) {
      useCircuitStore.getState().selectElement(component.id);
      return; // arduino-connected component: select only, not draggable
    }
    if (!groupRef.current) return;
    e.stopPropagation();

    useCircuitStore.getState().selectElement(component.id);
    const start = localPoint(groupRef.current, e.clientX, e.clientY);
    let moved = false;
    let lastValidHoles = null;

    const onMove = (ev) => {
      const p = localPoint(groupRef.current, ev.clientX, ev.clientY);
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < DRAG_THRESHOLD) return;
      moved = true;

      // Anchor on whichever original terminal is nearest the drag start -
      // that terminal "follows the cursor," the rest keep the same offset.
      let anchorId = holeEntries[0][1];
      let anchorDist = Infinity;
      for (const [, id] of holeEntries) {
        const hp = holes.find((h) => h.id === id);
        if (!hp) continue;
        const d = Math.hypot(hp.x - start.x, hp.y - start.y);
        if (d < anchorDist) {
          anchorDist = d;
          anchorId = id;
        }
      }

      const hole = nearestHole(holes, p.x, p.y, { excludeArduino: true });
      if (!hole) return;
      const newHoles = computeComponentMove(holeEntries, anchorId, hole.col);
      if (!newHoles) return; // out of bounds - ignore this move, keep last valid ghost

      lastValidHoles = newHoles;
      setGhost({ kind: 'component', id: component.id, type: component.type, holes: newHoles });
    };

    const onUp = () => {
      if (moved && lastValidHoles) {
        const problems = findShortedComponents(useCircuitStore.getState().wires, {
          addComponents: [{ type: component.type, holes: lastValidHoles }],
        });
        if (problems.length === 0) {
          useCircuitStore.getState().moveComponent(component.id, lastValidHoles);
        }
      }
      cleanup();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    sessionRef.current = { onMove, onUp };
  }, [holes, groupRef, cleanup]);

  const onWireMouseDown = useCallback((wire, e) => {
    if (e.button !== 0) return;
    if (!groupRef.current) return;
    e.stopPropagation();

    useCircuitStore.getState().selectElement(wire.id);
    const start = localPoint(groupRef.current, e.clientX, e.clientY);
    const aPos = holes.find((h) => h.id === wire.fromHole);
    const bPos = holes.find((h) => h.id === wire.toHole);
    const distA = aPos ? Math.hypot(aPos.x - start.x, aPos.y - start.y) : Infinity;
    const distB = bPos ? Math.hypot(bPos.x - start.x, bPos.y - start.y) : Infinity;
    const endpoint = distA <= distB ? 'fromHole' : 'toHole';
    const otherHole = endpoint === 'fromHole' ? wire.toHole : wire.fromHole;

    let moved = false;
    let candidateHole = null;

    const onMove = (ev) => {
      const p = localPoint(groupRef.current, ev.clientX, ev.clientY);
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < DRAG_THRESHOLD) return;
      moved = true;

      const hole = nearestHole(holes, p.x, p.y);
      if (!hole) return;
      candidateHole = hole.id;
      setGhost({ kind: 'wire', id: wire.id, fromHole: endpoint === 'fromHole' ? hole.id : otherHole, toHole: endpoint === 'toHole' ? hole.id : otherHole });
    };

    const onUp = () => {
      if (moved && candidateHole) {
        useCircuitStore.getState().moveWireEndpoint(wire.id, endpoint, candidateHole);
      }
      cleanup();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    sessionRef.current = { onMove, onUp };
  }, [holes, groupRef, cleanup]);

  return { ghost, onComponentMouseDown, onWireMouseDown };
}
