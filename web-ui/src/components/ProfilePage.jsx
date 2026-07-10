import React from 'react';
import { useAuthStore } from '../state/authStore';
import { useThemeStore } from '../state/themeStore';
import { THEMES } from '../theme/themes';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

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
          {THEMES.map((t) => (
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
        </div>
      </section>
    </div>
  );
}
