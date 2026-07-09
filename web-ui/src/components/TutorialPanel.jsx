import React, { useState } from 'react';
import { useTutorialStore } from '../state/tutorialStore';
import { useCircuitStore } from '../state/circuitStore';

function StepBadges({ step }) {
  const hasWiring = step.addComponents.length > 0 || step.addWires.length > 0;
  const hasCode = step.sketch !== null && step.sketch !== undefined;
  if (!hasWiring && !hasCode) return null;
  return (
    <div className="preset-row">
      {hasWiring && <span className="preset-chip is-active">wiring</span>}
      {hasCode && <span className="preset-chip is-active">code</span>}
    </div>
  );
}

// Shown in the Inspector's Tutorials tab when nothing is being played or
// created - browsing, favoriting, and starting/creating tutorials all live
// on the full TutorialsPage now (see src/components/TutorialsPage.jsx);
// this tab is only for the live-board interaction (playing/recording).
function EmptyState() {
  const setPage = useCircuitStore((s) => s.setPage);
  return (
    <div className="tutorial-panel">
      <p className="empty-hint">No tutorial in progress.</p>
      <button className="run-button" onClick={() => setPage('tutorials')}>Browse Tutorials</button>
    </div>
  );
}

function PlayView() {
  const activeTutorial = useTutorialStore((s) => s.activeTutorial);
  const stepIndex = useTutorialStore((s) => s.stepIndex);
  const lastCheckResult = useTutorialStore((s) => s.lastCheckResult);
  const nextStep = useTutorialStore((s) => s.nextStep);
  const prevStep = useTutorialStore((s) => s.prevStep);
  const placeStepForMe = useTutorialStore((s) => s.placeStepForMe);
  const checkStep = useTutorialStore((s) => s.checkStep);
  const exitTutorial = useTutorialStore((s) => s.exitTutorial);

  if (!activeTutorial) return null;
  const step = activeTutorial.steps[stepIndex];
  const isLast = stepIndex === activeTutorial.steps.length - 1;

  return (
    <div className="tutorial-panel">
      <div className="tutorial-card-header">
        <span className="tutorial-card-title">{activeTutorial.title}</span>
        <button className="tutor-reset" onClick={exitTutorial}>Exit</button>
      </div>
      <p className="empty-hint">Step {stepIndex + 1} of {activeTutorial.steps.length}</p>

      <p className="tutorial-instructions">{step.instructions}</p>
      <StepBadges step={step} />

      {step.sketch !== null && step.sketch !== undefined && (
        <pre className="tutorial-sketch-preview">{step.sketch}</pre>
      )}

      <div className="tutorial-card-actions">
        <button className="run-button" onClick={placeStepForMe}>Place for me</button>
        <button className="reset-button" onClick={checkStep}>Check my circuit</button>
      </div>
      {lastCheckResult && (
        <div className={lastCheckResult.ok ? 'tutorial-check-ok' : 'tutorial-check-fail'}>
          {lastCheckResult.message}
        </div>
      )}

      <div className="tutorial-card-actions">
        <button className="reset-button" onClick={prevStep} disabled={stepIndex === 0}>Prev</button>
        <button className="run-button" onClick={isLast ? exitTutorial : nextStep}>
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function CreateView() {
  const draft = useTutorialStore((s) => s.draft);
  const captureStep = useTutorialStore((s) => s.captureStep);
  const removeDraftStep = useTutorialStore((s) => s.removeDraftStep);
  const finishAndSaveDraft = useTutorialStore((s) => s.finishAndSaveDraft);
  const cancelCreating = useTutorialStore((s) => s.cancelCreating);
  const exportTutorial = useTutorialStore((s) => s.exportTutorial);
  const saveError = useTutorialStore((s) => s.saveError);

  const [instructions, setInstructions] = useState('');
  const [downloadCopy, setDownloadCopy] = useState(true);

  if (!draft) return null;

  const capture = () => {
    if (!instructions.trim()) return;
    captureStep(instructions);
    setInstructions('');
  };

  const finish = () => {
    const { id } = draft;
    const result = finishAndSaveDraft();
    if (result.success && downloadCopy) exportTutorial(id);
  };

  return (
    <div className="tutorial-panel">
      <div className="tutorial-card-header">
        <span className="tutorial-card-title">{draft.title}</span>
        <button className="tutor-reset" onClick={cancelCreating}>Cancel</button>
      </div>
      <p className="empty-hint">
        Build the next part of your circuit and/or edit the Arduino code, describe what you just did, then capture it as a step.
      </p>

      <ul className="netlist-list">
        {draft.steps.map((step, i) => (
          <li key={step.id}>
            {i + 1}. {step.instructions}
            <button className="tutor-reset" onClick={() => removeDraftStep(i)} style={{ marginLeft: 8 }}>remove</button>
          </li>
        ))}
        {draft.steps.length === 0 && <li className="empty-hint">No steps captured yet.</li>}
      </ul>

      <textarea
        className="tutor-input"
        placeholder="What did you just do? (e.g. 'Add a resistor from the + rail to column 8')"
        rows={2}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />
      <button className="run-button" onClick={capture} disabled={!instructions.trim()}>Capture current step</button>

      <label className="tutorial-checkbox-row" style={{ marginTop: 14 }}>
        <input type="checkbox" checked={downloadCopy} onChange={(e) => setDownloadCopy(e.target.checked)} />
        Also download a copy when finished
      </label>
      {saveError && <div className="tutor-error">{saveError}</div>}
      <div className="tutorial-card-actions">
        <button className="run-button" onClick={finish} disabled={draft.steps.length === 0}>Finish &amp; Save</button>
      </div>
    </div>
  );
}

export default function TutorialPanel() {
  const mode = useTutorialStore((s) => s.mode);
  if (mode === 'play') return <PlayView />;
  if (mode === 'create') return <CreateView />;
  return <EmptyState />;
}
