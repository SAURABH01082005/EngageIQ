import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

// Existing pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AIQuery from './pages/AIQuery'
import Recommendations from './pages/Recommendations'
import ExportReport from './pages/ExportReport'
import ConjugateMedia from './pages/ConjugateMedia'
import Landing from './LandingPage/Landing.jsx'

// Components
import HomePage from './components/HomePage'
import LinkedInConnect from './components/LinkedInConnect'
import CompanyTables from './components/CompanyTables'
import CompanyDashboard from './components/CompanyDashboard'
import CompanyCards from './components/CompanyCards'
import LinkedInDashboard from './components/LinkedInDashboard'
import EngagementAnalysis from './components/EngagementAnalysis'
import CompanyAnalysis from './components/CompanyAnalysis'

import './styles/App.css'

const ROUTE_MAP = {
  landing: '/',
  login: '/login',
  home: '/connect-platforms',
  'connect-platforms': '/connect-platforms',
  dashboard: '/dashboard',
  'ai-query': '/ai-query',
  conjugate: '/conjugate',
  recommendations: '/recommendations',
  export: '/export',
  'linkedin-connect': '/linkedin-connect',
  'company-tables': '/company-tables',
  'company-dashboard': '/company-dashboard',
  'company-cards': '/company-cards',
  'linkedin-dashboard': '/linkedin-dashboard',
  'engagement-analysis': '/engagement-analysis',
  'company-analysis': '/company-analysis',
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const readStorageValue = (key) => {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.warn(`Unable to read localStorage key "${key}"`, error)
    return null
  }
}

const writeStorageValue = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Unable to write localStorage key "${key}"`, error)
  }
}

const readJsonStorage = (key, fallback) => {
  const saved = readStorageValue(key)
  if (!saved) return fallback

  try {
    return JSON.parse(saved)
  } catch (error) {
    console.warn(`Ignoring malformed localStorage key "${key}"`, error)
    return fallback
  }
}

const readConnectedPlatforms = () => {
  const saved = readJsonStorage('connectedPlatforms', [])

  if (Array.isArray(saved)) {
    return saved.filter((platform) => typeof platform === 'string')
  }

  if (isPlainObject(saved)) {
    return Object.keys(saved).filter((key) => saved[key] === 'connected')
  }

  return []
}

const readCompanies = () => {
  const saved = readJsonStorage('companies', [])
  return Array.isArray(saved) ? saved : []
}

const readSelectedCompany = () => {
  const saved = readJsonStorage('selectedCompany', null)
  return isPlainObject(saved) ? saved : null
}

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Screen render failed', error, info)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.location?.pathname !== this.props.location?.pathname && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen-fallback">
          <AppShell size="sm">
            <div className="app-shell__body screen-fallback__panel">
              <h1>EngageIQ</h1>
              <p>We could not restore that screen, so start from the landing page.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  this.props.onReset()
                }}
              >
                Go to Landing
              </button>
            </div>
          </AppShell>
        </div>
      )
    }

    return this.props.children
  }
}

function AuthRedirect({ showToast }) {
  useEffect(() => {
    if (showToast) {
      showToast('🔒 Please login first or click "View Demo" to explore test data in EngageIQ.', 'warning');
    }
  }, [showToast]);
  return <Navigate to="/" replace />;
}

function ProtectedRoute({ user, isDemo, showToast, children }) {
  if (!user && !isDemo) {
    return <AuthRedirect showToast={showToast} />;
  }
  return children;
}

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()

  const [currentUser, setCurrentUser] = useState(null)
  const [conjugateMissingModal, setConjugateMissingModal] = useState(false)
  const [checkedConjugateEmail, setCheckedConjugateEmail] = useState('')

  const [isDemoMode, setIsDemoMode] = useState(() => {
    return sessionStorage.getItem('isDemoMode') === 'true'
  })

  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'warning') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev))
    }, 4000)
  }

  const startDemo = () => {
    setIsDemoMode(true)
    sessionStorage.setItem('isDemoMode', 'true')
    localStorage.setItem('userEmail', 'default_user')
    showToast('✨ Demo Mode Active: Select & connect platforms to analyze test data', 'info')
    navigateTo('connect-platforms')
  }

  const [connectedPlatforms, setConnectedPlatforms] = useState(() => {
    return readConnectedPlatforms()
  })
  const [companies, setCompanies] = useState(() => {
    return readCompanies()
  })
  const [selectedCompany, setSelectedCompany] = useState(() => {
    return readSelectedCompany()
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user?.email) {
        setIsDemoMode(false)
        sessionStorage.removeItem('isDemoMode')
        localStorage.setItem('userEmail', user.email)
        try {
          const res = await fetch(`/api/auth/verify-conjugate-account?email=${encodeURIComponent(user.email)}`)
          const data = await res.json()
          if (data && data.hasConjugateAccount === false) {
            setCheckedConjugateEmail(user.email)
            setConjugateMissingModal(true)
          } else {
            setConjugateMissingModal(false)
          }
        } catch (e) {
          console.warn('Conjugate account check error:', e)
        }
      } else {
        setConjugateMissingModal(false)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    writeStorageValue('connectedPlatforms', JSON.stringify(connectedPlatforms))
  }, [connectedPlatforms])

  useEffect(() => {
    writeStorageValue('companies', JSON.stringify(companies))
  }, [companies])

  useEffect(() => {
    writeStorageValue('selectedCompany', JSON.stringify(selectedCompany))
  }, [selectedCompany])

  const navigateTo = (screen, options = {}) => {
    if (typeof screen !== 'string') return
    const path = screen.startsWith('/') ? screen : (ROUTE_MAP[screen] || `/${screen}`)
    navigate(path, { state: options })
  }

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="app">
      {/* ── Toast Notifications ── */}
      {toast && (
        <div className="app-toast-container">
          <div className={`app-toast app-toast--${toast.type}`}>
            <span>{toast.type === 'warning' ? '🔒' : toast.type === 'info' ? '✨' : '🎉'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <ScreenErrorBoundary location={location} onReset={() => navigate('/')}>
        <Routes>
          <Route path="/" element={<Landing onNavigate={navigateTo} onStartDemo={startDemo} showToast={showToast} />} />
          <Route
            path="/login"
            element={
              <Login
                onConnect={(platforms) => {
                  setConnectedPlatforms(platforms)
                  navigateTo('connect-platforms')
                }}
                onBack={goBack}
              />
            }
          />
          <Route
            path="/connect-platforms"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <HomePage
                  onNavigate={navigateTo}
                  onBack={goBack}
                  onConnect={(platforms) => setConnectedPlatforms(platforms)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={<Navigate to="/connect-platforms" replace />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <Dashboard
                  onNavigate={navigateTo}
                  onBack={goBack}
                  connectedPlatforms={connectedPlatforms}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-query"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <AIQuery
                  onNavigate={navigateTo}
                  onBack={goBack}
                  connectedPlatforms={connectedPlatforms}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conjugate"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <ConjugateMedia
                  onNavigate={navigateTo}
                  onBack={goBack}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <Recommendations
                  onNavigate={navigateTo}
                  onBack={goBack}
                  connectedPlatforms={connectedPlatforms}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/export"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <ExportReport onNavigate={navigateTo} onBack={goBack} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/linkedin-connect"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <LinkedInConnect
                  onNavigate={navigateTo}
                  onBack={goBack}
                  onSetCompanies={setCompanies}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company-tables"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <CompanyTables
                  companies={companies}
                  onNavigate={navigateTo}
                  onBack={goBack}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company-dashboard"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <CompanyDashboard onNavigate={navigateTo} onBack={goBack} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company-cards"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <CompanyCards onNavigate={navigateTo} onBack={goBack} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/linkedin-dashboard"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <LinkedInDashboard onNavigate={navigateTo} onBack={goBack} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/engagement-analysis"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <EngagementAnalysis
                  onNavigate={navigateTo}
                  onBack={goBack}
                  selectedCompany={selectedCompany}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company-analysis"
            element={
              <ProtectedRoute user={currentUser} isDemo={isDemoMode} showToast={showToast}>
                <CompanyAnalysis
                  onNavigate={navigateTo}
                  onBack={goBack}
                  companies={companies}
                  onSetSelectedCompany={setSelectedCompany}
                />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ScreenErrorBoundary>

      {/* ── Conjugate Media Account Required Modal ── */}
      {conjugateMissingModal && (
        <div className="landing-auth-overlay" style={{ zIndex: 9999999 }}>
          <div className="landing-auth-modal" style={{ maxWidth: '500px', textAlign: 'center', padding: '2.5rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              Conjugate Media Account Required
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1.75rem 0' }}>
              The logged-in account <strong style={{ color: '#38bdf8' }}>{checkedConjugateEmail}</strong> is not registered on <strong>Conjugate Media</strong>.
              <br /><br />
              EngageIQ only connects to social media data for accounts that have an active Conjugate Media profile.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <a
                href="http://localhost:5174"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'block', padding: '0.85rem', textDecoration: 'none', fontWeight: 700, textAlign: 'center' }}
              >
                🚀 Register on Conjugate Media (Port 5174)
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  setConjugateMissingModal(false);
                  try {
                    await signOut(auth);
                    localStorage.removeItem('userEmail');
                    navigate('/');
                  } catch (e) {}
                }}
              >
                Sign Out / Switch Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return <AppContent />
}

export default App
