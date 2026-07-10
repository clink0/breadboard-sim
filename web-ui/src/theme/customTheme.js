import { isLight, rgba } from './colorUtils';

// The small set of colors a user actually picks when creating a theme -
// everything else (overlays, tints) is derived from these so the form
// doesn't need 15 color pickers. Defaults match the "Sandy" built-in.
export const CUSTOM_THEME_FIELDS = [
  { key: 'bg', label: 'Background', default: '#ecdfb8' },
  { key: 'panel', label: 'Panel', default: '#e2cf9f' },
  { key: 'panelBorder', label: 'Border / highlight', default: '#6b4a2b' },
  { key: 'text', label: 'Text', default: '#3a2a16' },
  { key: 'textDim', label: 'Dim text', default: '#8a7350' },
  { key: 'accent', label: 'Accent', default: '#e8630f' },
  { key: 'cyan', label: 'Secondary accent', default: '#1f7fa0' },
  { key: 'danger', label: 'Danger', default: '#b8382b' },
];

export function defaultCustomColors() {
  return Object.fromEntries(CUSTOM_THEME_FIELDS.map((f) => [f.key, f.default]));
}

// Mirrors the hand-picked values in the "sand"/"slate" [data-theme] blocks
// in global.css, but computed from just the 8 picked colors above.
export function buildCustomThemeVars(colors) {
  const overlayBase = isLight(colors.bg) ? '#000000' : '#ffffff';
  return {
    '--bg': colors.bg,
    '--panel': colors.panel,
    '--panel-border': colors.panelBorder,
    '--text': colors.text,
    '--text-dim': colors.textDim,
    '--copper': colors.accent,
    '--cyan': colors.cyan,
    '--danger': colors.danger,
    '--overlay-subtle': rgba(overlayBase, 0.05),
    '--overlay-hover': rgba(overlayBase, 0.07),
    '--overlay-strong': rgba(overlayBase, 0.1),
    '--copper-tint': rgba(colors.accent, 0.14),
    '--copper-tint-strong': rgba(colors.accent, 0.4),
    '--danger-tint': rgba(colors.danger, 0.12),
    '--cyan-tint': rgba(colors.cyan, 0.14),
  };
}
