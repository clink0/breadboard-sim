import { TERMINALS } from '../../src/state/deviceTerminals.js';

// Plain data module (no React/zustand), safe to import from server code -
// keeps the tool's component-type enum in sync with what the app actually
// supports instead of hardcoding a second list that can drift.
const COMPONENT_TYPES = Object.keys(TERMINALS).filter((t) => t !== 'wire');

// The one tool the AI tutor can call: add components/wires to the
// breadboard and/or replace the Arduino sketch. See server/lib/tutorPersona.js
// for the hole-addressing scheme and value-format rules the model is taught
// so it can fill this in correctly; see src/utils/validateCircuitPatch.js for
// where the resulting input actually gets checked before being applied.
export const CIRCUIT_TOOLS = [
  {
    name: 'modify_circuit',
    description: 'Add one or more components and/or wires to the student\'s breadboard, and/or replace the contents of the Arduino IDE editor. Only adds - never removes or edits an existing component. Always pair this with a short text reply explaining what you did.',
    input_schema: {
      type: 'object',
      properties: {
        addComponents: {
          type: 'array',
          description: 'New components to place on the board.',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: COMPONENT_TYPES },
              value: { description: 'Component value - format depends on type, see system prompt.' },
              holes: {
                type: 'object',
                description: 'Map of terminal name -> hole id, one entry per terminal the component type requires.',
              },
            },
            required: ['type', 'holes'],
          },
        },
        addWires: {
          type: 'array',
          description: 'New ideal wires connecting two holes.',
          items: {
            type: 'object',
            properties: {
              fromHole: { type: 'string' },
              toHole: { type: 'string' },
            },
            required: ['fromHole', 'toHole'],
          },
        },
        arduinoSketch: {
          type: 'string',
          description: 'The complete new contents of the Arduino IDE editor (not a diff/snippet). Omit unless the student needs new or changed code.',
        },
      },
    },
  },
];
