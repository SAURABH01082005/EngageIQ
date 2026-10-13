import React, { useState } from "react";
import AppShell from "../components/AppShell";
import "../styles/Login.css";

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "facebook", name: "Facebook", icon: "👥" },
  { id: "twitter", name: "Twitter", icon: "𝕏" }
];

function Login({ onConnect, onBack }) {
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [error, setError] = useState("");

  const handleConnect = async (platformId) => {
    setConnectedPlatforms((prev) => ({ ...prev, [platformId]: "loading" }));
    setError("");

    return new Promise((resolve) => {
      setTimeout(() => {
        setConnectedPlatforms((prev) => ({
          ...prev,
          [platformId]: "connected"
        }));
        resolve();
      }, 1000);
    });
  };

  const handleProceed = () => {
    const selected = Object.keys(connectedPlatforms).filter(
      (p) => connectedPlatforms[p] === "connected"
    );

    if (selected.length === 0) {
      setError("Please connect at least one platform to proceed.");
      return;
    }

    if (typeof onConnect === "function") {
      onConnect(selected);
    }
  };

  const connectedCount = Object.values(connectedPlatforms).filter(
    (v) => v === "connected"
  ).length;

  return (
    <AppShell size="sm" className="login-page">
      <div className="app-shell__body login-page__inner">
        <header className="login-page__header">
          <button onClick={onBack} className="btn btn-secondary btn-sm">
            ← Back
          </button>
        </header>

        <div className="login-card">
          <div className="login-header">
            <h1>Welcome to EngageIQ</h1>
            <p>Analyze your social media performance with AI-powered insights</p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <div className="login-content">
            <h2 className="section-title">Connect Your Platforms</h2>
            <div className="platform-buttons">
              {PLATFORMS.map((platform) => {
                const status = connectedPlatforms[platform.id];
                const isConnected = status === "connected";
                const isLoading = status === "loading";

                return (
                  <button
                    key={platform.id}
                    onClick={() => handleConnect(platform.id)}
                    disabled={isConnected}
                    className={`platform-button ${isConnected ? "connected" : ""} ${
                      isLoading ? "loading" : ""
                    }`}
                    title={
                      isConnected
                        ? `${platform.name} is connected`
                        : `Connect ${platform.name}`
                    }
                  >
                    <span className="platform-icon">{platform.icon}</span>
                    <span className="platform-text">
                      {isLoading && <span className="loading-spinner sm" />}
                      {isConnected && <span className="checkmark-mini">✓</span>}
                      {!isLoading && !isConnected && (
                        <span>Connect {platform.name}</span>
                      )}
                      {isConnected && <span>Connected {platform.name}</span>}
                      {isLoading && <span>Connecting...</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {connectedCount > 0 && (
              <div className="connection-status">
                <p className="mb-0">
                  Connected: <strong>{connectedCount}</strong> platform(s)
                </p>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg btn-block mt-4"
              onClick={handleProceed}
              disabled={connectedCount === 0}
            >
              Proceed to Dashboard →
            </button>
          </div>

          <div className="login-footer">
            <p className="text-center text-muted text-sm mb-0">
              We securely store your data. Your platforms are never shared with
              third parties.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default Login;
