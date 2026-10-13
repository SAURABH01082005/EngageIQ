import React, { useState, useEffect } from 'react';
import "./Landing.css";
import Register from '../Login/Register'
import AppShell from '../components/AppShell'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import { HiChartBarSquare, HiSparkles, HiUserGroup } from "react-icons/hi2";

const FEATURES = [
  {
    id: 1,
    icon: HiChartBarSquare,
    title: "Advanced Analytics",
    description: "Track engagement metrics across all platforms with real-time dashboards"
  },
  {
    id: 2,
    icon: HiSparkles,
    title: "AI-Powered Insights",
    description: "Get intelligent recommendations to optimize your content strategy"
  },
  {
    id: 3,
    icon: HiUserGroup,
    title: "Audience Intelligence",
    description: "Understand your audience demographics and behavior patterns"
  },
  {
    id: 4,
    icon: HiChartBarSquare,
    title: "Performance Tracking",
    description: "Monitor post performance and predict engagement trends"
  },
  {
    id: 5,
    icon: HiSparkles,
    title: "Content Calendar",
    description: "Plan and schedule content across multiple platforms seamlessly"
  },
  {
    id: 6,
    icon: HiUserGroup,
    title: "Team Collaboration",
    description: "Work together with your team on content strategy and analysis"
  }
];

const STATS = [
  { number: "500+", label: "Active Users" },
  { number: "50+", label: "Companies" },
  { number: "1M+", label: "Posts Analyzed" },
  { number: "99.9%", label: "Uptime" }
];

const Landing = ({ onNavigate, onStartDemo, showToast }) => {
    const [loginStatus, setLoginStatus] = useState(false);
    const [registerStatus, setRegisterStatus] = useState(false);
    const [loginError, setLoginError] = useState(null)
    const [loginLoading, setLoginLoading] = useState(false)
    const [user, setUser] = useState(null)

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setLoginStatus(false);
                setRegisterStatus(false);
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [])

    useEffect(() => {
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u)
      })
      return () => unsub()
    }, [])

    const handleGetStarted = () => {
      if (user) {
        onNavigate("home");
      } else {
        if (showToast) {
          showToast('🔒 Please login first or click "View Demo" to explore test data in EngageIQ.', 'warning');
        }
        setLoginStatus(true);
      }
    };

    const handleViewDemo = () => {
      if (onStartDemo) {
        onStartDemo();
      } else {
        onNavigate("dashboard");
      }
    };

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoginError(null)
        setLoginLoading(true)
        const form = e.target
        const email = form.email?.value?.trim()
        const password = form.password?.value
        try {
            // 1. Verify that user has an account in Conjugate Media
            const checkRes = await fetch(`/api/auth/verify-conjugate-account?email=${encodeURIComponent(email)}`)
            const checkData = await checkRes.json()
            if (checkData && checkData.hasConjugateAccount === false) {
                setLoginError(`🚫 No Conjugate Media account found for "${email}". EngageIQ only connects to accounts registered on Conjugate Media. Please create an account on Conjugate Media (http://localhost:5174) first.`)
                setLoginLoading(false)
                return
            }

            await signInWithEmailAndPassword(auth, email, password)
            if (email) localStorage.setItem('userEmail', email)
            onNavigate("home");
            setLoginStatus(false)
        } catch (err) {
            setLoginError(err.message || 'Sign in failed')
        } finally {
            setLoginLoading(false)
        }
    }

    return (
      <AppShell scroll className="landing-page">
        {/* Navigation */}
        <nav className="landing-nav">
          <div className="nav-brand">
            <h2><span>Engage</span>IQ</h2>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#impact">Impact</a>
            <a href="#trusted">Trusted By</a>
            <a href="#footer">Contact</a>
          </div>
          <div className="nav-actions">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="landing-user-badge" title={`Logged in as ${user.email}`}>
                  <span className="landing-user-dot"></span>
                  <span className="landing-user-email">{user.email}</span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      await signOut(auth);
                      setUser(null);
                      localStorage.removeItem('userEmail');
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button className="btn btn-secondary" onClick={() => { setLoginStatus(true); }}>Login</button>
            )}
            <button className="btn btn-primary" onClick={handleGetStarted}>Get Started</button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1>Turn Social Media Data Into <span>Actionable Intelligence</span></h1>
            <p>Analyze performance, understand your audience, and make smarter content decisions using real-time social media insights — all from one powerful dashboard.</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={handleGetStarted}>Get Started Free</button>
              <button className="btn btn-secondary btn-lg" onClick={handleViewDemo}>View Demo</button>
            </div>
          </div>
          <div className="hero-stats">
            {STATS.map((stat) => (
              <div key={stat.label} className="stat-card">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="section-header">
            <h2>Powerful Features for Modern Analytics</h2>
            <p>Everything you need to understand and grow your social media presence</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.id} className="feature-card">
                  <div className="feature-icon">
                    <IconComponent size={32} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Impact Section */}
        <section id="impact" className="impact-section">
          <div className="section-header">
            <h2>Built on Trust. Driven by Results.</h2>
            <p>We don't just build software, we build relationships.</p>
          </div>
          <div className="impact-cards">
            <div className="impact-card">
              <span className="impact-number">01</span>
              <h3>10+ Years of Tech Expertise</h3>
              <p>Proven track record in delivering enterprise-grade solutions</p>
            </div>
            <div className="impact-card">
              <span className="impact-number">02</span>
              <h3>Transparent Agile Process</h3>
              <p>Clear communication and collaborative development approach</p>
            </div>
            <div className="impact-card">
              <span className="impact-number">03</span>
              <h3>Dedicated Support Team</h3>
              <p>24/7 support and maintenance for your peace of mind</p>
            </div>
            <div className="impact-card">
              <span className="impact-number">04</span>
              <h3>Data Security First</h3>
              <p>Enterprise-grade encryption and privacy protection</p>
            </div>
          </div>
        </section>

        {/* Trusted Section */}
        <section id="trusted" className="trusted-section">
          <div className="section-header">
            <h2>Trusted By Industry Leaders</h2>
            <p>Join creators, startups, and marketing teams that use EngageIQ</p>
          </div>
          <div className="trusted-grid">
            <div className="trusted-badge">For Creators</div>
            <div className="trusted-badge">For Startups</div>
            <div className="trusted-badge">For Agencies</div>
            <div className="trusted-badge">For Enterprises</div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <h2>Ready to Grow Your Social Media Presence?</h2>
          <p>Start analyzing your social media data today. Free for the first 30 days.</p>
          <button className="btn btn-primary btn-lg" onClick={handleGetStarted}>Get Started Now</button>
        </section>

        {/* Footer */}
        <footer id="footer" className="landing-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>EngageIQ</h3>
              <p>Turn raw social media data into meaningful insights. Analyze performance, track growth, and understand your audience — all in one intelligent dashboard.</p>
            </div>
            <div className="footer-column">
              <h4>Product</h4>
              <ul>
                <li><a href="#">Dashboard</a></li>
                <li><a href="#">Analytics</a></li>
                <li><a href="#">Insights</a></li>
                <li><a href="#">Pricing</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">API Reference</a></li>
                <li><a href="#">Guides</a></li>
                <li><a href="#">FAQs</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 EngageIQ. All rights reserved. | Built for Social Media Analytics</p>
          </div>
        </footer>

        {/* ── Login Modal ── */}
        {loginStatus && (
          <div className="landing-auth-overlay" onClick={() => setLoginStatus(false)}>
            <div className="landing-auth-modal" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="landing-modal-close"
                onClick={() => setLoginStatus(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="landing-modal-header">
                <h2>Welcome Back</h2>
                <p>Sign in to access your social media intelligence suite</p>
              </div>
              <form onSubmit={handleLogin} className="landing-auth-form">
                <div className="landing-form-group">
                  <label className="landing-form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className="landing-form-input"
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div className="landing-form-group">
                  <label className="landing-form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="landing-form-input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {loginError && <div className="alert alert-error">{loginError}</div>}
                <div className="landing-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setLoginStatus(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loginLoading}
                  >
                    {loginLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
                <p className="landing-modal-footer-text">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="link-text"
                    onClick={() => {
                      setLoginStatus(false);
                      setRegisterStatus(true);
                    }}
                  >
                    Register here
                  </button>
                </p>
              </form>
            </div>
          </div>
        )}

        {/* ── Register Modal ── */}
        {registerStatus && (
          <div className="landing-auth-overlay" onClick={() => setRegisterStatus(false)}>
            <div className="landing-auth-modal" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="landing-modal-close"
                onClick={() => setRegisterStatus(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <Register
                onClose={() => setRegisterStatus(false)}
                onSwitchToLogin={() => {
                  setRegisterStatus(false);
                  setLoginStatus(true);
                }}
              />
            </div>
          </div>
        )}
      </AppShell>
    )
}

export default Landing;
