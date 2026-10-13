import { useState } from "react";
import PageLayout from "./PageLayout";
import "./HomePage.css";

const PLATFORMS = [
  { id: "linkedin", name: "LinkedIn", icon: "🔗" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "x", name: "X (Twitter)", icon: "𝕏" },
  { id: "facebook", name: "Facebook", icon: "👥" }
];

function HomePage({ onNavigate, onBack, onConnect }) {
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [error, setError] = useState("");

  const handleConnect = async (platform) => {
    setConnectedPlatforms((prev) => ({ ...prev, [platform]: "loading" }));
    setError("");

    return new Promise((resolve) => {
      setTimeout(() => {
        setConnectedPlatforms((prev) => ({ ...prev, [platform]: "connected" }));
        resolve();
      }, 1000);
    });
  };

  const handleConnectAll = () => {
    const all = {};
    PLATFORMS.forEach((p) => {
      all[p.id] = "connected";
    });
    setConnectedPlatforms(all);
    setError("");
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

    if (selected.length === 1 && selected[0] === "linkedin") {
      onNavigate("linkedin-connect");
    } else {
      onNavigate("dashboard");
    }
  };

  return (
    <PageLayout
      title="Connect Your Platforms"
      subtitle="Select and connect the social media platforms you want to analyze."
      onBack={onBack}
      size="md"
      className="home-page"
    >
      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleConnectAll}
          title="Connect all simulated platforms at once"
        >
          ⚡ Connect All (1-Click)
        </button>
      </div>

      <div className="platform-grid">
        {PLATFORMS.map((platform) => {
          const status = connectedPlatforms[platform.id];
          const isConnected = status === "connected";
          const isLoading = status === "loading";

          return (
            <button
              key={platform.id}
              className={`platform-card ${isConnected ? "connected" : ""} ${
                isLoading ? "loading" : ""
              }`}
              onClick={() => handleConnect(platform.id)}
              disabled={isConnected}
              title={isConnected ? `${platform.name} is connected` : `Connect ${platform.name}`}
            >
              <div className="platform-icon">{platform.icon}</div>
              <div className="platform-name">{platform.name}</div>
              <div className="platform-status">
                {isLoading && <span className="loading-spinner sm" />}
                {isConnected && <span className="checkmark">✓</span>}
                {!isLoading && !isConnected && <span className="arrow">→</span>}
              </div>
            </button>
          );
        })}
      </div>

      {Object.values(connectedPlatforms).some((v) => v === "connected") && (
        <div className="connection-summary">
          <p className="text-center text-muted mb-0">
            Connected:{" "}
            <strong>
              {Object.keys(connectedPlatforms).filter(
                (p) => connectedPlatforms[p] === "connected"
              ).length}
            </strong>{" "}
            platform(s)
          </p>
        </div>
      )}

      <div className="home-page-actions">
        <button onClick={handleProceed} className="btn btn-primary btn-lg btn-block">
          Continue to Dashboard →
        </button>
      </div>
    </PageLayout>
  );
}

export default HomePage;
