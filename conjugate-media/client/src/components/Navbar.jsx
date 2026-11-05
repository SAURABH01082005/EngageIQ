import React from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import '../styles/Navbar.css';

const PLATFORMS = [
  { id: 'all', label: 'All Feeds', icon: '🌐', className: '' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', className: 'yt' },
  { id: 'instagram', label: 'Instagram', icon: '📸', className: 'ig' },
  { id: 'facebook', label: 'Facebook', icon: '👥', className: 'fb' },
  { id: 'linkedin', label: 'LinkedIn', icon: '🔗', className: 'li' },
  { id: 'twitter', label: 'X (Twitter)', icon: '𝕏', className: 'tw' }
];

export default function Navbar({
  selectedPlatform,
  onSelectPlatform,
  activeView = 'feed',
  onSelectView,
  currentUser,
  onOpenAuth
}) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="cm-navbar">
      {/* Left: Brand & View Switcher */}
      <div className="cm-nav-left">
        <div className="cm-nav-brand" onClick={() => onSelectPlatform('all')}>
          <span className="cm-nav-logo">💫</span>
          <span>Conjugate Media</span>
          <span className="cm-nav-subtext">Simulator</span>
        </div>

        {/* View Switcher: Feed vs Trending */}
        {onSelectView && (
          <div className="cm-nav-view-switcher">
            <button
              type="button"
              className={`cm-nav-view-btn ${activeView === 'feed' ? 'active' : ''}`}
              onClick={() => onSelectView('feed')}
            >
              <span>📱</span>
              <span>Creator Feed & Studio</span>
            </button>
            <button
              type="button"
              className={`cm-nav-view-btn ${activeView === 'trending' ? 'active trending-active' : ''}`}
              onClick={() => onSelectView('trending')}
            >
              <span>🔥</span>
              <span>Trending Radar</span>
              <span className="cm-trending-pill-tag">Live</span>
            </button>
          </div>
        )}
      </div>

      {/* Platform Switcher on Navbar */}
      <nav className="cm-nav-platforms" aria-label="Select Platform">
        {PLATFORMS.map((p) => {
          const isActive = selectedPlatform === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`cm-nav-plat-btn ${p.className} ${isActive ? `active ${p.className}` : ''}`}
              onClick={() => onSelectPlatform(p.id)}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Actions: EngageIQ link & User Auth */}
      <div className="cm-nav-right">
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          className="cm-engageiq-link"
          title="Open EngageIQ Analytics Dashboard"
        >
          <span>📊 EngageIQ App ↗</span>
        </a>

        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="cm-user-pill">
              <span className="cm-user-dot" />
              <span>{currentUser.email}</span>
            </div>
            <button
              type="button"
              className="cm-logout-btn"
              onClick={handleLogout}
              title="Sign out of Conjugate Media"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="cm-login-btn"
            onClick={onOpenAuth}
          >
            Sign in / Register
          </button>
        )}
      </div>
    </header>
  );
}
