# Breadboard Sim — MVP scaffold

This is Phase 0 of the larger plan: a working "digital twin" core (manual
placement, DC simulation, Falstad-style voltage/current visualization) with
no camera/ML yet. Verified with `npm install && npm run build` — builds
clean, and the MNA solver is checked against a known voltage-divider circuit
(9V across 1kΩ/2kΩ gives exactly 6V at the midpoint).

## How it works right now

- **`src/breadboard/layout.js`** — defines a standard half+ breadboard: two
  power rails (+/-) and two terminal-strip groups (rows a-e, f-j) split by a
  center gap. Every hole gets a *base node id* purely from its row/column —
  this is the free 90% of the netlist that doesn't need ML, because
  breadboard topology is fixed and known in advance.
- **`src/breadboard/topology.js`** — union-find that merges base nodes when
  a wire connects them (a wire is an ideal/zero-resistance link, so both
  ends really are the same node).
- **`src/sim/mna.js`** — a from-scratch Modified Nodal Analysis solver
  (resistors + independent voltage sources, DC only for now). This is the
  same family of technique falstad's circuitjs1 uses; the natural extension
  path is adding companion models for capacitors/inductors and stepping it
  in time for transient sim.
- **`src/sim/simulate.js`** — builds MNA elements from placed
  components+wires and derives per-component current for the visualization.
- **`src/components/`** — the UI: click a hole to start a wire/component,
  click a second hole to complete it. `ComponentLayer.jsx` is the
  Falstad-style layer — wires/components are colored by node voltage
  (`utils/colorScale.js`) and animated dots move along them via SVG
  `<animateMotion>`, sped up/slowed down and direction-flipped based on
  the solved current.

## Known simplifications (flagged for the next pass)

1. **LEDs are modeled as a fixed 40Ω resistor**, not a real diode I-V curve.
   Good enough to show current flow/lighting up, not physically accurate
   forward-voltage behavior. Next step: piecewise-linear or Newton-iteration
   diode model in `simulate.js`.
2. **Rails are single nodes** (no split at board midpoint like some real
   boards do). Easy to change in `layout.js` if you want that realism.
3. **DC only** — no capacitors/inductors/transient response yet. This is
   the natural next simulation feature and is where the current-flow
   visualization gets genuinely dynamic (charging curves, RC time
   constants, etc.) rather than a static snapshot.
4. **No undo/multi-select/drag-to-reposition** — placement is click-hole,
   click-hole only.
5. **No 3D view yet** — this scaffold is the 2D schematic/breadboard view
   only, matching the "core simulator + visualizer" phase. The 3D
   physical-breadboard view (withdiode-style) is the next phase, and should
   reuse the same `components`/`wires`/`simResult` state — it's a second
   renderer on the same store, not a separate app.
6. **No AI chat panel yet** — also next phase. When you add it, the
   natural integration point is `simResult` + `components` + `wires` from
   `circuitStore.js` as the context you hand to the model, and structured
   proposals (add component X between node A/B) that get applied through
   the *same* `clickHole`/store actions the UI already uses, so a proposal
   can be animated as a step-by-step placement rather than an instant diff.

## Running it

```
npm install
npm run dev
```

Palette on the left picks what you're placing. Click a hole, click a second
hole to complete a wire/resistor/LED/battery. Hit **Simulate** in the top
bar to color the board by voltage and animate current flow; **Stop** freezes
it; **Reset board** clears everything.
