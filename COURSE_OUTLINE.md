# Intro to Electronics — Course Outline (draft)

Status: **draft for iteration** — not yet built. This lays out the shape of a course
that teaches electronics from zero using Breadboard Sim as the hands-on tool, with
visual analogies (3D models, animations, graphs) doing the heavy lifting for
intuition before the math shows up.

## 1. Goals

- Someone with no electronics background should be able to go from "what is
  voltage" to "I built a working sensor + motor project" without ever feeling lost.
- Every abstract concept (charge, field, junction, PWM) gets a **physical analogy**
  and a **visual** before it gets a formula.
- Every unit ends with hands-on time **in the actual simulator** — not just reading.
- Reuses what already exists: the tutorial step system, oscilloscope, AI Tutor,
  Arduino live-run. New pieces (3D models, animated graphs) plug into that system
  rather than replacing it.

## 2. Pedagogical shape of a unit

Every unit follows the same five-beat structure, so learners build a rhythm:

1. **Hook** — a one-line "why does this matter" (e.g. "Why does your phone charger
   get warm?").
2. **Analogy** — a physical/mechanical analog explained via a short animation
   (water in pipes, gears, valves — see §4).
3. **Visualize** — the real electrical behavior, shown as an interactive graph or
   3D model, side by side with the analogy so the mapping is explicit.
4. **Simulate** — a guided build in Breadboard Sim (extends the existing tutorial
   step format) where the learner places components and watches the sim confirm
   the concept (via the oscilloscope, Inspector readings, or LED/motor behavior).
5. **Build / Check** — either a small project checkpoint or a "predict then
   verify" question (e.g. "what will the multimeter read here?" before hitting
   Simulate).

## 3. New visual building blocks needed

None of this exists in the app yet — this is the tech backlog that unlocks the
content below. Flagging up front so we can scope it before writing lessons that
depend on it.

| Component | Purpose | Notes |
|---|---|---|
| **Concept3D viewer** | Rotatable, simplified 3D models (resistor cutaway, capacitor plates, inductor coil + field lines, diode PN junction, BJT/MOSFET cross-section, breadboard internal rail structure) | Needs a 3D lib (three.js / react-three-fiber — not currently a dependency). Models can be stylized/low-poly, not photoreal — clarity over realism. |
| **AnimatedGraph** | Reusable interactive chart for I-V curves, RC/RL charge curves, AC waveforms, PWM duty cycle, transistor characteristic curves | The oscilloscope's existing SVG trace rendering (`Oscilloscope.jsx`/`scope-panel-svg`) is a reasonable starting point/style reference rather than pulling in a full charting library. |
| **AnalogyAnimation** | Short looping animations for the water/mechanical analogies (see §4) | Could be pure CSS/SVG animation - no 3D needed, keeps these lightweight and fast to author. |
| **Tutorial step media field** | Extend the tutorial schema (`schema.js`/`validateTutorial.js`) so a step can attach a `visualAid: { type: '3d'|'graph'|'analogy', ref: '...' }` alongside its existing `instructions` text | Backward compatible - existing tutorials keep working with `visualAid: null`. |
| **Predict-then-verify prompt** | A lightweight step type: multiple choice or numeric guess, revealed/checked after the learner hits Simulate | New, small addition to the tutorial step schema. |

*(We'll scope/build these separately, iteratively, once the content plan below is settled.)*

## 4. Analogy library

One consistent analogy per concept, reused throughout so learners build a single
mental model instead of juggling several:

| Electrical concept | Analogy | Visual |
|---|---|---|
| Voltage | Water pressure / height in a tank | Two tanks at different heights connected by a pipe |
| Current | Water flow rate through a pipe | Animated particles flowing through a pipe cross-section |
| Resistance | Pipe narrowness / friction | Same pipe, animated with a narrowing section, flow slowing |
| Capacitor | A small tank that fills and drains, smoothing bursts of flow | Tank filling curve next to the charge-curve graph |
| Inductor | A heavy paddle wheel in the pipe — resists *changes* in flow, not flow itself | Paddle wheel spinning up/down lagging behind flow changes |
| Diode | A one-way check valve | Valve open one direction, animated water blocked the other |
| Transistor (switch mode) | A pilot-controlled valve — a small control flow opens/closes a big flow | Small pipe controlling a large gate |
| Transistor (amplifier mode) | A valve where the control flow *shapes* the big flow's profile, not just on/off | Overlaid graphs: small control signal vs. amplified output |
| Potentiometer | An adjustable pipe clamp | Slider animation narrowing/widening a pipe live |
| PWM | Rapidly flicking a valve on/off - average flow depends on how long it's open per cycle | Square wave graph next to a "perceived brightness/speed" needle |

## 5. Course structure

### Part 1 — Foundations of Electricity

**Unit 1.1 — What is electricity, really?**
- Hook: "Why do wires need to form a loop?"
- Analogy: closed water loop with a pump
- Visual: 3D atom model → electron cloud → simplified "sea of electrons in a
  conductor" animation
- Sim: place a battery + wire loop in Breadboard Sim, nothing happens without a
  closed path — demonstrate open vs. closed circuit
- Existing tool tie-in: none yet needed beyond basic placement

**Unit 1.2 — Voltage, Current, Resistance (Ohm's Law)**
- Analogy: tank height (V) → pipe flow (I) → pipe narrowness (R)
- Visual: interactive V=IR graph — drag any two variables, watch the third respond
- Sim: battery + resistor + wire loop; change resistor value in Inspector, watch
  current reading update live
- Project checkpoint: "predict the current" exercise before hitting Simulate

**Unit 1.3 — Power and heat**
- Analogy: water hitting a paddle wheel — bigger pressure/flow = more work done
- Visual: P=IV surface/graph; resistor "heat" visualization (color shift on the
  component glyph as dissipated power increases)
- Sim: swap resistor values, observe power reading in Inspector; discuss why
  under-rated resistors would overheat (conceptual, not modeled physically)

**Unit 1.4 — Series vs. parallel circuits**
- Visual: animated current-splitting diagram
- Sim: build the same LED circuit two ways (series vs. parallel resistors),
  compare readings
- Project: "two LEDs, one battery" — series vs. parallel brightness comparison

### Part 2 — Passive Components

**Unit 2.1 — Resistors deep dive**
- Visual: 3D resistor cutaway (carbon film / resistive element), color-code
  reference chart
- Sim: build a simple voltage divider, predict then verify the midpoint voltage
  with a probe

**Unit 2.2 — Capacitors**
- Analogy: the filling/draining tank
- Visual: 3D parallel-plate model with animated electric field lines; RC
  charge/discharge curve (exponential) graph
- Sim: battery + resistor + capacitor + probe; use oscilloscope capture to watch
  the charge curve in real time; vary R and C, observe the time constant change
- Project: simple RC delay circuit ("LED that fades on instead of snapping on")

**Unit 2.3 — Inductors**
- Analogy: the paddle wheel resisting flow changes
- Visual: 3D coil with animated magnetic field lines; current ramp graph on
  step-change
- Sim: battery + resistor + inductor + probe, oscilloscope capture of current
  ramp-up

**Unit 2.4 — RC/RL circuits as filters (conceptual intro)**
- Visual: function generator sine sweep through an RC circuit, oscilloscope
  showing amplitude roll-off at high frequency
- Sim: use the function generator + probe + oscilloscope together for the first
  time
- *(Kept conceptual/qualitative — full filter theory is out of scope for "intro".)*

### Part 3 — Semiconductors

**Unit 3.1 — Diodes and LEDs**
- Analogy: the one-way check valve
- Visual: 3D PN junction / depletion-region model; I-V curve graph showing the
  forward-voltage "knee"
- Sim: revisit the classic LED + resistor circuit (existing `led-blink-basic`
  tutorial) now with the "why" fully explained; try wiring the LED backwards and
  observe nothing happens

**Unit 3.2 — Transistors as switches (BJT & MOSFET)**
- Analogy: the pilot-controlled valve
- Visual: 3D cross-section of a BJT and a MOSFET side by side, highlighting the
  control terminal vs. the main current path
- Sim: revisit/extend the existing `transistor-switch` tutorial; use a small
  base/gate signal to switch a motor or LED on the main path
- Project: transistor-driven motor circuit (small signal controls a bigger load)

**Unit 3.3 — Transistors as amplifiers (conceptual)**
- Visual: overlaid graph of a small input wiggle producing a larger output wiggle
- Sim: function generator into a transistor stage, oscilloscope comparing input
  vs. output amplitude
- *(Kept high-level — biasing/gain math deferred past "intro".)*

### Part 4 — Signals & Measurement

**Unit 4.1 — AC vs. DC, waveforms**
- Visual: sine/square/triangle wave gallery tied to the function generator's
  actual waveform options
- Sim: hands-on function generator + oscilloscope exploration

**Unit 4.2 — Reading an oscilloscope**
- Visual: annotated diagram of the app's own oscilloscope panel (time/div,
  amplitude, trigger concept simplified)
- Sim: guided "find these five features on the trace" exercise

**Unit 4.3 — PWM**
- Analogy: rapid valve-flicking, average flow
- Visual: square wave at varying duty cycle next to a "brightness/speed" gauge
- Sim: bridge into Part 5 — Arduino PWM output driving an LED's apparent
  brightness

### Part 5 — Microcontrollers & Programming

**Unit 5.1 — What's inside a microcontroller**
- Visual: simplified 3D/diagram of the Arduino Uno board already rendered in
  `ArduinoView` — annotate GPIO, power, the ATmega chip
- Sim: tour of the existing Arduino IDE panel in the app

**Unit 5.2 — Digital I/O**
- Sim: blink an LED via code (extends existing `arduino-blink` tutorial),
  digitalRead a button

**Unit 5.3 — Analog I/O & PWM in practice**
- Sim: analogRead a potentiometer, analogWrite/PWM to fade an LED or set motor
  speed

**Unit 5.4 — Sensors and actuators**
- Sim: servo sweep, DC motor speed control, simple simulated sensor input
- Project: light-following or threshold-triggered mini project

### Part 6 — Capstone Projects

A menu of integrative builds, each pulling together multiple units. Learner
picks one (or the course ships all as options):

1. **Reaction-time game** — button input, timing, LED/servo output
2. **Mini traffic light controller** — digital I/O + timing logic
3. **Analog thermostat-style demo** — potentiometer "sensor" + transistor/motor
   output + threshold logic
4. **Adjustable LED "dimmer"** — potentiometer → analogRead → PWM, ties together
   Units 2.1, 4.3, 5.3
5. **Simple audio-reactive-ish blink** — function generator as a stand-in
   "sensor" signal into a transistor switch

## 6. Sequencing & pacing (draft)

| Part | Units | Suggested pacing |
|---|---|---|
| 1. Foundations | 1.1–1.4 | ~1 sitting each, linear, no skipping |
| 2. Passive components | 2.1–2.4 | linear, builds directly on Part 1 |
| 3. Semiconductors | 3.1–3.3 | linear, requires Part 2 |
| 4. Signals & measurement | 4.1–4.3 | can interleave with Part 3 |
| 5. Microcontrollers | 5.1–5.4 | requires Parts 1–3, benefits from Part 4 |
| 6. Capstones | pick 1+ | requires Part 5 |

## 7. Open questions to resolve before building

- **3D library choice** — three.js directly vs. react-three-fiber (bundle size
  is already a flagged concern in `npm run build`'s chunk-size warning).
- **Graph approach** — hand-rolled SVG (matches existing oscilloscope style,
  zero new deps) vs. a small charting lib.
- **How "predict then verify" is scored**, if at all — purely formative, or
  tracked as part of tutorial completion/favorites?
- **Where course progress lives** — new store/repository (`courseProgress`?)
  following the same local-now/hosted-later repository-seam pattern as
  tutorials and themes.
- **Reuse vs. fork of existing tutorials** — `led-blink-basic`,
  `transistor-switch`, and `arduino-blink` already exist and map directly onto
  Units 3.1, 3.2, 5.2. Do we rewrite them in place with richer `visualAid`
  content, or treat course units as a new, separate content type layered on
  top of the tutorial system?
- **Narration/voice** — text-only instructions (current tutorial format) vs.
  adding optional audio narration later.

---

*Next step: iterate on this outline, then start scoping the technical backlog
in §3 before writing actual unit content.*
