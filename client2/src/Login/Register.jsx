import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function Register({ onClose, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="landing-modal-header">
        <h2>Create an Account</h2>
        <p>Join EngageIQ to start analyzing your cross-platform social media data</p>
      </div>
      <form onSubmit={handleSubmit} className="landing-auth-form">
        <div className="landing-form-group">
          <label className="landing-form-label">Email Address</label>
          <input
            type="email"
            name="email"
            className="landing-form-input"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="landing-form-group">
          <label className="landing-form-label">Password</label>
          <input
            type="password"
            name="password"
            className="landing-form-input"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="alert alert-error mb-3">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}
        <div className="landing-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { if (typeof onClose === 'function') onClose(); }}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
        {onSwitchToLogin && (
          <p className="landing-modal-footer-text">
            Already have an account?{' '}
            <button
              type="button"
              className="link-text"
              onClick={onSwitchToLogin}
            >
              Sign in here
            </button>
          </p>
        )}
      </form>
    </div>
  );
}
