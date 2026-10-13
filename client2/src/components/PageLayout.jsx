import React, { useState, useEffect } from "react";
import AppShell from "./AppShell";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "./PageLayout.css";

export function createDashboardNav(onNavigate, current) {
  const norm = (current || "").toString().replace(/^\//, "");
  return [
    { label: "Dashboard", onClick: () => onNavigate("dashboard"), active: norm === "dashboard" },
    { label: "AI Query", onClick: () => onNavigate("ai-query"), active: norm === "ai-query" },
    { label: "Conjugate Media", onClick: () => onNavigate("conjugate"), active: norm === "conjugate" },
    { label: "Recommendations", onClick: () => onNavigate("recommendations"), active: norm === "recommendations" },
    { label: "Export", onClick: () => onNavigate("export"), active: norm === "export" },
  ];
}

function PageLayout({
  title,
  subtitle,
  onBack,
  backLabel = "← Back",
  nav = [],
  children,
  className = "",
  size = "lg",
  layout = "default",
}) {
  const isDashboard = layout === "dashboard";
  const shellSize = isDashboard ? "lg" : size;

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  const displayEmail = currentUser?.email || localStorage.getItem("userEmail") || "";

  return (
    <AppShell size={shellSize} className={`page-layout ${isDashboard ? "page-layout--dashboard" : ""} ${className}`.trim()}>
      <div className="page-top">
        <div className="page-top__row">
          {onBack && (
            <button type="button" onClick={onBack} className="btn btn-secondary btn-sm page-top__back">
              {backLabel}
            </button>
          )}
          <div className="page-top__titles">
            <h1>{title}</h1>
            {subtitle && <p className="page-top__subtitle">{subtitle}</p>}
          </div>

          {isDashboard && nav.length > 0 && (
            <nav className="page-nav page-nav--tabs" aria-label="Dashboard sections">
              {nav.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`page-tab ${item.active ? "page-tab--active" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {!isDashboard && nav.length > 0 && (
            <nav className="page-nav page-nav--inline" aria-label="Page navigation">
              {nav.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`btn btn-sm ${item.active ? "btn-primary" : "btn-secondary"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* ── User / Demo Mode Badge ── */}
          {currentUser ? (
            <div className="page-top__user">
              <div className="page-user-pill" title={`Logged in as ${currentUser.email}`}>
                <span className="page-user-dot"></span>
                <span className="page-user-email">{currentUser.email}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm page-logout-btn"
                title="Sign out of EngageIQ"
                onClick={async () => {
                  try {
                    await signOut(auth);
                    localStorage.removeItem("userEmail");
                    sessionStorage.removeItem("isDemoMode");
                    window.location.href = "/";
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Logout
              </button>
            </div>
          ) : (sessionStorage.getItem("isDemoMode") === "true" || displayEmail === "default_user") ? (
            <div className="page-top__user">
              <div className="page-user-pill page-user-pill--demo" title="Currently exploring sample test data in Demo Mode">
                <span className="page-demo-icon">🧪</span>
                <span className="page-user-email">Demo Mode (Test Data)</span>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm page-logout-btn"
                title="Sign in to connect live data"
                onClick={() => {
                  sessionStorage.removeItem("isDemoMode");
                  window.location.href = "/";
                }}
              >
                Sign In
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <main className="page-body">{children}</main>
    </AppShell>
  );
}

export default PageLayout;
