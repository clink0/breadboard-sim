// Where the backend lives. Empty locally (relative /api/* paths, bridged by
// web-ui/vite.config.js's dev proxy); set to the hosted backend's URL (e.g.
// https://your-backend.fly.dev) via VITE_API_BASE_URL in production - see
// DEPLOYMENT.md.
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
