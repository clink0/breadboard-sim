// Shared scope-channel palette (traditional cyan/yellow/magenta/green scope
// trace colors), used by both the Oscilloscope panel and the Inspector's
// probe channel swatch so they always agree.
export const CHANNEL_COLORS = ['#57c7e3', '#e8d34c', '#e35ce3', '#4ce35c'];

export function channelColorForIndex(i) {
  return CHANNEL_COLORS[i % CHANNEL_COLORS.length];
}
