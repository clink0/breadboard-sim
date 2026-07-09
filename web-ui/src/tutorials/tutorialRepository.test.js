import { describe, it, expect, beforeEach } from 'vitest';
import { listFavoriteIds, setFavorite } from './tutorialRepository';

// vitest here runs in a plain Node environment (see vite.config.js), which
// doesn't reliably provide a browser-style localStorage - stub a minimal
// in-memory one so tutorialRepository's localStorage calls have somewhere
// to land.
function createLocalStorageStub() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  globalThis.localStorage = createLocalStorageStub();
});

describe('tutorialRepository favorites', () => {
  it('starts empty', () => {
    expect(listFavoriteIds()).toEqual([]);
  });

  it('setFavorite(id, true) adds an id, and it persists across calls', () => {
    setFavorite('led-blink-basic', true);
    expect(listFavoriteIds()).toEqual(['led-blink-basic']);
  });

  it('setFavorite(id, true) is idempotent', () => {
    setFavorite('led-blink-basic', true);
    setFavorite('led-blink-basic', true);
    expect(listFavoriteIds()).toEqual(['led-blink-basic']);
  });

  it('setFavorite(id, false) removes it', () => {
    setFavorite('led-blink-basic', true);
    setFavorite('arduino-blink', true);
    setFavorite('led-blink-basic', false);
    expect(listFavoriteIds()).toEqual(['arduino-blink']);
  });
});
