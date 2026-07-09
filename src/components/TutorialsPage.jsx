import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTutorialStore } from '../state/tutorialStore';
import { listBuiltInTutorials } from '../tutorials/tutorialRepository';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const ROW_SCROLL_AMOUNT = 320;

function TutorialCard({ tutorial, builtInIds, favoriteIds, onToggleFavorite, onStart, onExport, onDelete }) {
  const isBuiltIn = builtInIds.has(tutorial.id);
  const isFavorite = favoriteIds.has(tutorial.id);

  return (
    <div className="tutorial-card-large">
      <div className="tutorial-card-header">
        <span className="tutorial-card-title">{tutorial.title}</span>
        <button
          className={`favorite-button ${isFavorite ? 'is-active' : ''}`}
          onClick={() => onToggleFavorite(tutorial.id)}
          aria-label={isFavorite ? 'Remove from your library' : 'Add to your library'}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>
      <p className="tutorial-card-desc">{tutorial.description}</p>
      <div className="preset-row">
        <span className="preset-chip is-active">{tutorial.difficulty}</span>
        {tutorial.requiresArduino && <span className="preset-chip is-active">Arduino</span>}
        <span className="preset-chip">{tutorial.steps.length} steps</span>
        <span className={`tutorial-badge tutorial-badge-${isBuiltIn ? 'builtin' : 'community'}`}>
          {isBuiltIn ? 'Built-in' : 'Community'}
        </span>
      </div>
      <div className="tutorial-card-actions">
        <button className="run-button" onClick={() => onStart(tutorial.id)}>Start</button>
        <button className="reset-button" onClick={() => onExport(tutorial.id)}>Export</button>
        {!isBuiltIn && <button className="remove-button" onClick={() => onDelete(tutorial.id)}>Delete</button>}
      </div>
    </div>
  );
}

function CreateTile({ onClick }) {
  return (
    <button className="tutorial-create-tile" onClick={onClick}>
      <span className="tutorial-create-tile-plus">+</span>
      <span>Create new tutorial</span>
    </button>
  );
}

function TutorialRow({ title, tutorials, emptyHint, leading, cardProps }) {
  const scrollRef = useRef(null);
  const scrollBy = (dx) => scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  if (tutorials.length === 0 && !leading && !emptyHint) return null;

  return (
    <section className="tutorial-row">
      <h3 className="tutorial-row-title">{title}</h3>
      <div className="tutorial-row-wrap">
        <button className="tutorial-row-scroll-button" onClick={() => scrollBy(-ROW_SCROLL_AMOUNT)} aria-label={`Scroll ${title} left`}>‹</button>
        <div className="tutorial-row-scroll" ref={scrollRef}>
          {leading}
          {tutorials.map((t) => (
            <TutorialCard key={t.id} tutorial={t} {...cardProps} />
          ))}
          {tutorials.length === 0 && emptyHint && <p className="empty-hint tutorial-row-empty-hint">{emptyHint}</p>}
        </div>
        <button className="tutorial-row-scroll-button" onClick={() => scrollBy(ROW_SCROLL_AMOUNT)} aria-label={`Scroll ${title} right`}>›</button>
      </div>
    </section>
  );
}

export default function TutorialsPage() {
  const library = useTutorialStore((s) => s.library);
  const favoriteIds = useTutorialStore((s) => s.favoriteIds);
  const refreshLibrary = useTutorialStore((s) => s.refreshLibrary);
  const refreshFavorites = useTutorialStore((s) => s.refreshFavorites);
  const toggleFavorite = useTutorialStore((s) => s.toggleFavorite);
  const startTutorial = useTutorialStore((s) => s.startTutorial);
  const exportTutorial = useTutorialStore((s) => s.exportTutorial);
  const deleteTutorial = useTutorialStore((s) => s.deleteTutorial);
  const importFromFile = useTutorialStore((s) => s.importFromFile);
  const importError = useTutorialStore((s) => s.importError);
  const startCreating = useTutorialStore((s) => s.startCreating);

  const builtInIds = useMemo(() => new Set(listBuiltInTutorials().map((t) => t.id)), []);
  const fileInputRef = useRef(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', difficulty: 'beginner', requiresArduino: false });

  useEffect(() => {
    refreshLibrary();
    refreshFavorites();
  }, [refreshLibrary, refreshFavorites]);

  const featured = library.filter((t) => t.featured);
  const yourLibrary = library.filter((t) => favoriteIds.has(t.id));
  const yourTutorials = library.filter((t) => !builtInIds.has(t.id));

  const cardProps = { builtInIds, favoriteIds, onToggleFavorite: toggleFavorite, onStart: startTutorial, onExport: exportTutorial, onDelete: deleteTutorial };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) importFromFile(file);
    e.target.value = '';
  };

  const submitCreate = () => {
    if (!form.title.trim()) return;
    startCreating(form);
    setShowCreateForm(false);
    setForm({ title: '', description: '', difficulty: 'beginner', requiresArduino: false });
  };

  return (
    <div className="tutorials-page">
      <div className="tutorials-page-header">
        <h1 className="tutorials-page-title">Tutorials</h1>
        <button className="reset-button" onClick={() => fileInputRef.current?.click()}>Import file…</button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      {importError && <div className="tutor-error">{importError}</div>}

      <TutorialRow title="Featured" tutorials={featured} cardProps={cardProps} />
      <TutorialRow
        title="Your Library"
        tutorials={yourLibrary}
        emptyHint="Favorite a tutorial (♡) to see it here."
        cardProps={cardProps}
      />
      <TutorialRow
        title="Your Tutorials"
        tutorials={yourTutorials}
        emptyHint="You haven't created any tutorials yet."
        leading={<CreateTile onClick={() => setShowCreateForm((v) => !v)} />}
        cardProps={cardProps}
      />

      {showCreateForm && (
        <div className="tutorial-create-form">
          <input
            className="tutorial-text-input"
            placeholder="Tutorial title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="tutor-input"
            placeholder="Short description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="preset-row">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={`preset-chip ${form.difficulty === d ? 'is-active' : ''}`}
                onClick={() => setForm({ ...form, difficulty: d })}
              >
                {d}
              </button>
            ))}
          </div>
          <label className="tutorial-checkbox-row">
            <input
              type="checkbox"
              checked={form.requiresArduino}
              onChange={(e) => setForm({ ...form, requiresArduino: e.target.checked })}
            />
            Involves Arduino code
          </label>
          <button className="run-button" onClick={submitCreate} disabled={!form.title.trim()}>
            Start recording
          </button>
        </div>
      )}

      <TutorialRow title="All Tutorials" tutorials={library} emptyHint="No tutorials yet." cardProps={cardProps} />
    </div>
  );
}
