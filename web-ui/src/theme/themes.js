// Built-in themes: swatches mirror the CSS variables defined per
// [data-theme] in src/styles/global.css - keep the two in sync when adding
// one. Custom (user-created) themes don't live here - see customTheme.js,
// they're computed at runtime instead of pinned in CSS.
export const BUILT_IN_THEMES = [
  {
    id: 'sand',
    label: 'Sandy',
    description: 'Warm sandy beige with an orange accent (default)',
    swatch: { bg: '#ecdfb8', panel: '#e2cf9f', accent: '#e8630f', highlight: '#6b4a2b' },
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Deep moss green with a warm gold accent',
    swatch: { bg: '#16211a', panel: '#1e2b21', accent: '#d99a3d', highlight: '#35492f' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep navy with a bright teal accent',
    swatch: { bg: '#0a141c', panel: '#101f2b', accent: '#2dd4bf', highlight: '#1d3a4d' },
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'The original dark blue-grey look',
    swatch: { bg: '#12141a', panel: '#1a1d25', accent: '#e8a33d', highlight: '#2a2e39' },
  },
];

export const BUILT_IN_THEME_IDS = BUILT_IN_THEMES.map((t) => t.id);
export const DEFAULT_THEME_ID = 'sand';

// Every CSS custom property a full theme needs to set. Built-in themes
// define these in a static [data-theme] block; custom themes compute them
// at runtime and apply them as inline styles on <html> (see themeStore.js)
// - inline styles win over the stylesheet regardless of which [data-theme]
// block is also matched, so this is what actually makes a custom theme
// override the "sand" fallback.
export const THEME_VARS = [
  '--bg', '--panel', '--panel-border', '--text', '--text-dim',
  '--copper', '--cyan', '--danger',
  '--overlay-subtle', '--overlay-hover', '--overlay-strong',
  '--copper-tint', '--copper-tint-strong', '--danger-tint', '--cyan-tint',
];
