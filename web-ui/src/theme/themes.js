// Swatches mirror the CSS variables defined per [data-theme] in
// src/styles/global.css - keep the two in sync when adding a theme.
export const THEMES = [
  {
    id: 'sand',
    label: 'Sandy',
    description: 'Warm sandy beige with an orange accent (default)',
    swatch: { bg: '#ecdfb8', panel: '#e2cf9f', accent: '#e8630f', highlight: '#6b4a2b' },
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'The original dark blue-grey look',
    swatch: { bg: '#12141a', panel: '#1a1d25', accent: '#e8a33d', highlight: '#2a2e39' },
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const DEFAULT_THEME_ID = 'sand';
