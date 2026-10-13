// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './components/AppShell.css';
import './styles/utilities.css';
import App from './App.jsx';

// Global Fetch Interceptor to forward logged-in user's email ONLY on internal /api endpoints
const originalFetch = window.fetch;
window.fetch = function (input, init = {}) {
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
  
  // Only inject custom headers into internal relative /api routes
  // This prevents CORS preflight failures on Google Firebase Auth (identitytoolkit.googleapis.com)
  const isInternalApi = url.startsWith('/api') ||
    url.startsWith('/conjugate-api') ||
    (typeof window !== 'undefined' && url.startsWith(window.location.origin) && url.includes('/api'));

  if (isInternalApi) {
    const userEmail = localStorage.getItem('userEmail') || 'default_user';
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : {}));
    if (!headers.has('x-user-email')) {
      headers.set('x-user-email', userEmail);
    }
    if (!headers.has('x-user-id')) {
      headers.set('x-user-id', userEmail);
    }
    return originalFetch(input, { ...init, headers });
  }

  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
