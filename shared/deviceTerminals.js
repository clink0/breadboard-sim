// Terminal role names per placeable component type, in click order. Drives
// both the N-click placement state machine in circuitStore.js and the
// `holes` map every component carries (`{ [terminalName]: holeId }`).
export const TERMINALS = {
  wire: ['a', 'b'],
  resistor: ['a', 'b'],
  led: ['anode', 'cathode'],
  battery: ['pos', 'neg'],
  capacitor: ['a', 'b'],
  inductor: ['a', 'b'],
  motor: ['a', 'b'],
  servo: ['a', 'b'],
  bjt_npn: ['collector', 'base', 'emitter'],
  bjt_pnp: ['collector', 'base', 'emitter'],
  mosfet_n: ['drain', 'gate', 'source'],
  mosfet_p: ['drain', 'gate', 'source'],
  function_gen: ['pos', 'neg'],
  probe: ['tip', 'ref'],
};
