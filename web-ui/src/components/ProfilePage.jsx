import React, { useState } from 'react';
import { useAuthStore } from '../state/authStore';
import { useThemeStore } from '../state/themeStore';
import { BUILT_IN_THEMES } from '../theme/themes';
import { CUSTOM_THEME_FIELDS } from '../theme/customTheme';

// Reads whatever theme is currently applied (built-in or custom) as a
// starting point for the "create your own" form, so users tweak what
// they're already looking at instead of starting from scratch.
function readCurrentThemeColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (v) => style.getPropertyValue(v).trim();
  return {
    bg: read('--bg'),
    panel: read('--panel'),
    panelBorder: read('--panel-border'),
    text: read('--text'),
    textDim: read('--text-dim'),
    accent: read('--copper'),
    cyan: read('--cyan'),
    danger: read('--danger'),
  };
}

function ThemeForm({ initialLabel, initialColors, saveLabel, onCancel, onSave }) {
  const [label, setLabel] = useState(initialLabel);
  const [colors, setColors] = useState(initialColors);

  const setColor = (key, value) => setColors((c) => ({ ...c, [key]: value }));

  return (
    <div className="tutorial-create-form">
      <input
        className="tutorial-text-input"
        placeholder="Theme name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <div className="theme-form-grid">
        {CUSTOM_THEME_FIELDS.map((f) => (
          <label key={f.key} className="theme-color-field">
            <span>{f.label}</span>
            <input
              type="color"
              className="theme-color-input"
              value={colors[f.key]}
              onChange={(e) => setColor(f.key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="tutorial-card-actions">
        <button
          className="run-button"
          disabled={!label.trim()}
          onClick={() => onSave({ label: label.trim(), colors })}
        >
          {saveLabel}
        </button>
        <button className="reset-button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const customThemes = useThemeStore((s) => s.customThemes);
  const setTheme = useThemeStore((s) => s.setTheme);
  const saveCustomTheme = useThemeStore((s) => s.saveCustomTheme);
  const deleteCustomTheme = useThemeStore((s) => s.deleteCustomTheme);

  // null | { mode: 'create' } | { mode: 'edit', id, label, colors }
  const [formState, setFormState] = useState(null);

  const openCreateForm = () => setFormState({ mode: 'create', label: '', colors: readCurrentThemeColors() });
  const openEditForm = (t) => setFormState({ mode: 'edit', id: t.id, label: t.label, colors: t.colors });
  const closeForm = () => setFormState(null);

  const handleSave = ({ label, colors }) => {
    saveCustomTheme({ id: formState.mode === 'edit' ? formState.id : undefined, label, colors });
    closeForm();
  };

  return (
    <div className="tutorials-page">
      <div className="tutorials-page-header">
        <h2 className="tutorials-page-title">Profile</h2>
      </div>

      <section className="profile-section">
        <h3 className="panel-subtitle">Account</h3>
        {user ? (
          <p className="empty-hint">Signed in as {user.email}</p>
        ) : (
          <p className="empty-hint">
            Not signed in - your color scheme is saved on this device only. Sign in (top right) to keep it with your account.
          </p>
        )}
      </section>

      <section className="profile-section">
        <h3 className="panel-subtitle">Color scheme</h3>
        <div className="theme-picker">
          {BUILT_IN_THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-swatch-button ${theme === t.id ? 'is-active' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <span className="theme-swatch-preview">
                <span className="theme-swatch-chip" style={{ background: t.swatch.bg }} />
                <span className="theme-swatch-chip" style={{ background: t.swatch.panel }} />
                <span className="theme-swatch-chip" style={{ background: t.swatch.accent }} />
                <span className="theme-swatch-chip" style={{ background: t.swatch.highlight }} />
              </span>
              <span className="theme-swatch-label">{t.label}</span>
              <span className="theme-swatch-desc">{t.description}</span>
            </button>
          ))}

          {customThemes.map((t) => (
            <div key={t.id} className={`theme-swatch-button ${theme === t.id ? 'is-active' : ''}`}>
              <button className="theme-swatch-preview-button" onClick={() => setTheme(t.id)}>
                <span className="theme-swatch-preview">
                  <span className="theme-swatch-chip" style={{ background: t.colors.bg }} />
                  <span className="theme-swatch-chip" style={{ background: t.colors.panel }} />
                  <span className="theme-swatch-chip" style={{ background: t.colors.accent }} />
                  <span className="theme-swatch-chip" style={{ background: t.colors.panelBorder }} />
                </span>
                <span className="theme-swatch-label">{t.label}</span>
                <span className="theme-swatch-desc">Your theme</span>
              </button>
              <div className="tutorial-card-actions">
                <button className="reset-button" onClick={() => openEditForm(t)}>Edit</button>
                <button className="remove-button" onClick={() => deleteCustomTheme(t.id)}>Delete</button>
              </div>
            </div>
          ))}

          {!formState && (
            <button className="theme-create-tile" onClick={openCreateForm}>
              <span className="theme-create-tile-plus">+</span>
              <span>Create your own</span>
            </button>
          )}
        </div>

        {formState && (
          <ThemeForm
            initialLabel={formState.label}
            initialColors={formState.colors}
            saveLabel={formState.mode === 'edit' ? 'Save changes' : 'Save theme'}
            onCancel={closeForm}
            onSave={handleSave}
          />
        )}
      </section>
    </div>
  );
}
