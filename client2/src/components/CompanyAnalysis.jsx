import "./CompanyAnalysis.css";
import PageLayout from "./PageLayout";

function CompanyAnalysis({ onNavigate, onBack, companies, onSetSelectedCompany }) {
  let company;
  if (Array.isArray(companies) && companies.length > 0) {
    company = companies[0];
  } else if (companies && typeof companies === "object") {
    company = companies;
  } else {
    return (
      <PageLayout title="Company Analysis" onBack={onBack}>
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">Company Not Found</h3>
          <p className="empty-state-text">Try searching again with a different company name or ID.</p>
          <button className="btn btn-primary" onClick={() => onNavigate("linkedin-connect")}>
            Search Again
          </button>
        </div>
      </PageLayout>
    );
  }

  const { name, headline, location: companyLocation, followers, connections, about, content, media_urls } = company;

  const handleToggle = () => {
    onSetSelectedCompany(company);
    onNavigate("engagement-analysis");
  };

  return (
    <PageLayout title={name || "Company Analysis"} subtitle="Detailed company profile and insights" onBack={onBack}>
      <div className="summary-cards">
        <div className="card">
          <h3>Industry</h3>
          <p>{headline || "N/A"}</p>
        </div>
        <div className="card">
          <h3>Location</h3>
          <p>{companyLocation || "N/A"}</p>
        </div>
        <div className="card">
          <h3>Followers</h3>
          <p>{followers || "N/A"}</p>
        </div>
        <div className="card">
          <h3>Connections</h3>
          <p>{connections || "N/A"}</p>
        </div>
      </div>

      <div className="main-card">
        <h2>Company Overview</h2>
        <div className="analysis-content">
          <p><strong>About:</strong> {about || "N/A"}</p>
          <p><strong>Recent Content:</strong> {content || "N/A"}</p>
          {Array.isArray(media_urls) && media_urls.length > 0 && (
            <div className="analysis-media">
              <strong>Media:</strong>
              {media_urls.map((url, index) => (
                <div key={index}>
                  {url.includes(".mp4") || url.includes(".webm") ? (
                    <video controls src={url} />
                  ) : (
                    <img src={url} alt={`Media ${index + 1}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="company-analysis-actions">
        <button className="btn btn-primary btn-lg" onClick={handleToggle}>
          Analyze Engagement →
        </button>
      </div>
    </PageLayout>
  );
}

export default CompanyAnalysis;
