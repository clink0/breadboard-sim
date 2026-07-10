import React, { useEffect } from 'react';
import { useCircuitStore } from './state/circuitStore';
import { useArduinoStore } from './state/arduinoStore';
import { useAuthStore } from './state/authStore';
import { useTutorialStore } from './state/tutorialStore';
import { useThemeStore } from './state/themeStore';
import { useAvrLiveRun } from './arduino/useAvrLiveRun';
import TopBar from './components/TopBar';
import Palette from './components/Palette';
import Breadboard from './components/Breadboard';
import Inspector from './components/Inspector';
import Oscilloscope from './components/Oscilloscope';
import ArduinoView from './components/ArduinoView';
import PanZoomCanvas from './components/PanZoomCanvas';
import ShortPlacementWarning from './components/ShortPlacementWarning';
import TutorialsPage from './components/TutorialsPage';
import ProfilePage from './components/ProfilePage';

export default function App() {
  const page = useCircuitStore((s) => s.page);
  const view = useCircuitStore((s) => s.view);
  const hex = useArduinoStore((s) => s.hex);
  const running = useArduinoStore((s) => s.running);
  // Always mounted (not inside ArduinoView, and regardless of `page`) so a
  // running sketch keeps driving the breadboard live even while the user is
  // browsing tutorials.
  const { led12Ref, led13Ref } = useAvrLiveRun(hex, running);

  const initAuth = useAuthStore((s) => s.init);
  useEffect(() => { initAuth(); }, [initAuth]);

  const initTheme = useThemeStore((s) => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  // Loaded once at startup (not just when TutorialsPage mounts) so anything
  // that can jump straight into a tutorial without visiting that page first
  // - the in-Inspector Tutorials tab, a Palette info tooltip's "See example"
  // link - has a populated library to look the tutorial up in.
  const refreshTutorialLibrary = useTutorialStore((s) => s.refreshLibrary);
  const refreshTutorialFavorites = useTutorialStore((s) => s.refreshFavorites);
  useEffect(() => {
    refreshTutorialLibrary();
    refreshTutorialFavorites();
  }, [refreshTutorialLibrary, refreshTutorialFavorites]);

  // Delete/Backspace removes the selected component or wire, unless focus is
  // in a text field (chat box, tutorial form, Monaco's hidden textarea) -
  // otherwise Backspace-while-typing would delete circuit elements.
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const { selectedId, removeElement } = useCircuitStore.getState();
      if (!selectedId) return;
      e.preventDefault();
      removeElement(selectedId);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app-shell">
      <ShortPlacementWarning />
      <TopBar />
      {page === 'tutorials' ? (
        <TutorialsPage />
      ) : page === 'profile' ? (
        <ProfilePage />
      ) : view === 'breadboard' ? (
        <div className="app-body">
          <Palette />
          <main className="board-stage">
            <div className="board-scroll">
              <PanZoomCanvas>
                <Breadboard />
              </PanZoomCanvas>
            </div>
            <Oscilloscope />
          </main>
          <Inspector />
        </div>
      ) : (
        <ArduinoView led12Ref={led12Ref} led13Ref={led13Ref} />
      )}
    </div>
  );
}
