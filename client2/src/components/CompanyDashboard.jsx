import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageLayout from "./PageLayout";
import "./CompanyDashboard.css";

function CompanyDashboard({ onNavigate, onBack }) {
  const location = useLocation();
  const companies = location.state?.companies || [];

  useEffect(() => {
    console.log("Incoming companies JSON:", companies);
  }, [companies]);

  if (companies.length === 0) {
    return (
      <PageLayout title="Company Dashboard" onBack={() => onNavigate("landing")} backLabel="← Back to Landing">
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <h3 className="empty-state-title">No Companies Found</h3>
          <p className="empty-state-text">Search for a company to view analysis data.</p>
          <button className="btn btn-primary" onClick={() => onNavigate("linkedin-connect")}>
            Search Companies
          </button>
        </div>
      </PageLayout>
    );
  }

  const totalCompanies = companies.length;
  const uniqueIndustries = new Set(companies.map((company) => company["industries"]).filter(Boolean)).size;
  const uniqueCountries = new Set(companies.map((company) => company["country_code"]).filter(Boolean)).size;

  return (
    <PageLayout title="Company Analysis Dashboard" onBack={onBack}>
      <div className="summary-section">
        <div className="summary-card">
          <h3>Total Companies</h3>
          <p className="summary-value">{totalCompanies}</p>
        </div>
        <div className="summary-card">
          <h3>Unique Industries</h3>
          <p className="summary-value">{uniqueIndustries}</p>
        </div>
        <div className="summary-card">
          <h3>Unique Countries</h3>
          <p className="summary-value">{uniqueCountries}</p>
        </div>
      </div>

      <div className="cards-grid">
        {companies.map((company, index) => (
          <div key={index} className="company-card">
            <h2 className="company-name">{company["name"] || "N/A"}</h2>
            <p className="company-detail">
              <strong>Industry:</strong> {company["industries"] || "N/A"}
            </p>
            <p className="company-detail">
              <strong>Location:</strong>{" "}
              {(company["headquarters"] || company["locations"])
                ? `${company["headquarters"] || ""}, ${company["country_code"] || ""}`.replace(/^,|,$/g, "")
                : "N/A"}
            </p>
            <p className="company-detail">
              <strong>Company Size:</strong> {company["company_size"] || "N/A"}
            </p>
            <div className="company-links">
              {company["website"] && (
                <a href={company["website"]} target="_blank" rel="noopener noreferrer" className="link-button">
                  Website
                </a>
              )}
              {company["url"] && (
                <a href={company["url"]} target="_blank" rel="noopener noreferrer" className="link-button linkedin-link">
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

export default CompanyDashboard;
