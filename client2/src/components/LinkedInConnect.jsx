import "./LinkedInConnect.css";
import { useState } from "react";
import { apiService, handleApiError } from "../services/apiService";
import PageLayout from "./PageLayout";

function LinkedInConnect({ onNavigate, onSetCompanies, onBack }) {
  const [formData, setFormData] = useState({
    companyId: "",
    companyName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    const { companyId, companyName } = formData;

    if (!companyId && !companyName) {
      setError("Please enter either a company ID or name");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const companies = await apiService.companies.findCompany({
        companyId,
        companyName,
      });

      if (!companies || companies.length === 0) {
        setError("No companies found. Please try another search.");
        setLoading(false);
        return;
      }

      setSuccess(`Found ${companies.length} company(ies)!`);
      onSetCompanies(companies);

      setTimeout(() => {
        onNavigate("company-analysis");
      }, 500);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConnect = () => {
    setError("");
    setSuccess("Google authentication coming soon!");
  };

  return (
    <PageLayout
      title="LinkedIn Connection"
      subtitle="Enter company details to get started"
      onBack={onBack}
      size="md"
    >
      <div className="form-container">
        {error && (
          <div className="alert alert-error mb-3">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-3">
            <span>✓</span>
            <div>{success}</div>
          </div>
        )}

        <form onSubmit={handleSearch}>
          <div className="form-group">
            <label className="form-label">Company ID (Optional)</label>
            <input
              type="text"
              name="companyId"
              value={formData.companyId}
              onChange={handleInputChange}
              placeholder="e.g., 12345"
              disabled={loading}
            />
            <span className="form-hint">Enter the LinkedIn company ID</span>
          </div>

          <div className="form-group">
            <label className="form-label">Company Name (Optional)</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder="e.g., TechCorp"
              disabled={loading}
            />
            <span className="form-hint">Enter the company name for search</span>
          </div>

          <div className="card-footer">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner sm" /> Searching...
                </>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </form>

        <div className="divider-text">OR</div>

        <button
          type="button"
          className="btn btn-secondary btn-block btn-lg"
          onClick={handleGoogleConnect}
          disabled={loading}
        >
          Continue with Google
        </button>
      </div>
    </PageLayout>
  );
}

export default LinkedInConnect;
