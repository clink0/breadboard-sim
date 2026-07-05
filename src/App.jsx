import React from 'react';
import TopBar from './components/TopBar';
import Palette from './components/Palette';
import Breadboard from './components/Breadboard';
import Inspector from './components/Inspector';

export default function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <Palette />
        <main className="board-stage">
          <Breadboard />
        </main>
        <Inspector />
      </div>
    </div>
  );
}
