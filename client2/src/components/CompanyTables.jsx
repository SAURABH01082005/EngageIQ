import "./CompanyTables.css";
import PageLayout from "./PageLayout";

function CompanyTables({ companies, onNavigate, onBack }) {
  const companyRows = Array.isArray(companies) ? companies : [];

  if (companyRows.length === 0) {
    return (
      <PageLayout title="Company Data" onBack={onBack}>
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">Company Not Found</h3>
          <p className="empty-state-text">No company data is available to display.</p>
          <button className="btn btn-primary" onClick={() => onNavigate("linkedin-connect")}>
            Search Companies
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Your LinkedIn Company" subtitle="Raw company data overview" onBack={() => onNavigate("landing")} backLabel="← Back to Landing">
      <div className="table-wrapper">
        <table className="data-table company-table">
          <thead>
            <tr>
              {Object.keys(companyRows[0]).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companyRows.map((company, index) => (
              <tr key={index}>
                {Object.values(company).map((value, i) => (
                  <td key={i}>{String(value ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="company-tables-actions">
        <button className="btn btn-primary" onClick={() => onNavigate("company-analysis")}>
          Analyze Further →
        </button>
      </div>
    </PageLayout>
  );
}

export default CompanyTables;
