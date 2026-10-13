import { useState, useEffect } from "react";
import axios from "axios";
import PageLayout from "./PageLayout";
import "./CompanyCard.css";

function CompanyCards({ onNavigate, onBack }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await axios.get("/api/companies");
        setCompanies(response.data);
      } catch {
        setError("Failed to fetch companies");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  if (loading) {
    return (
      <PageLayout title="LinkedIn Companies" onBack={onBack || (() => onNavigate("landing"))}>
        <div className="empty-state">
          <span className="loading-spinner lg" />
          <p className="empty-state-text mt-3">Loading companies...</p>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="LinkedIn Companies" onBack={() => onNavigate("landing")} backLabel="← Back to Landing">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">{error}</h3>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  if (companies.length === 0) {
    return (
      <PageLayout title="LinkedIn Companies" onBack={() => onNavigate("landing")} backLabel="← Back to Landing">
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <h3 className="empty-state-title">No Companies Found</h3>
          <p className="empty-state-text">Connect LinkedIn and search for companies to get started.</p>
          <button className="btn btn-primary" onClick={() => onNavigate("linkedin-connect")}>
            Search Companies
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Your LinkedIn Companies"
      subtitle={`${companies.length} companies found`}
      onBack={() => onNavigate("landing")}
      backLabel="← Back to Landing"
    >
      <div className="cards-grid">
        {companies.map((company, index) => (
          <div key={index} className="company-card">
            <h2 className="company-name">{company["Company Name"] || "N/A"}</h2>
            <p className="company-detail">
              <strong>Industry:</strong> {company["Industry"] || company["Category"] || "N/A"}
            </p>
            <p className="company-detail">
              <strong>Location:</strong> {company["Location"] || "N/A"}
            </p>
            <p className="company-detail">
              <strong>Company Size:</strong> {company["Company Size"] || "N/A"}
            </p>
            <p className="company-detail">
              <strong>Website:</strong> {company["Website"] || "N/A"}
            </p>
          </div>
        ))}
      </div>
      <div className="company-cards-actions">
        <button className="btn btn-primary" onClick={() => onNavigate("company-analysis")}>
          Analyze Further →
        </button>
      </div>
    </PageLayout>
  );
}

export default CompanyCards;
