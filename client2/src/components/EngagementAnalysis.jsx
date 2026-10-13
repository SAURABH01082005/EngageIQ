import "./EngagementAnalysis.css";
import { useEffect, useState } from "react";
import axios from "axios";
import EngagementPrediction from "./EngagementPrediction";
import PageLayout from "./PageLayout";

function EngagementAnalysis({ onNavigate, onBack, selectedCompany }) {
  const currentCompany = selectedCompany;

  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [predictionRequested, setPredictionRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentCompany?.name) return;

    const savedPosts = localStorage.getItem(`posts_${currentCompany.name}`);
    if (savedPosts) {
      try {
        const parsedPosts = JSON.parse(savedPosts);
        setPosts(Array.isArray(parsedPosts) ? parsedPosts : []);
      } catch (error) {
        console.warn("Ignoring malformed cached posts", error);
        localStorage.removeItem(`posts_${currentCompany.name}`);
      }
    }

    setLoading(true);
    axios
      .get("http://localhost:5001/api/companies/getCompanyPosts", {
        params: { companyName: currentCompany.name },
      })
      .then((res) => {
        setPosts(res.data);
        localStorage.setItem(`posts_${currentCompany.name}`, JSON.stringify(res.data));
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [currentCompany]);

  if (!currentCompany?.name) {
    return (
      <PageLayout title="Engagement Analysis" onBack={onBack}>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">No Company Selected</h3>
          <p className="empty-state-text">Select a company first to view post engagement data.</p>
          <button className="btn btn-primary" onClick={() => onNavigate("company-analysis")}>
            Go to Company Analysis
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={currentCompany.name}
      subtitle="Post performance and engagement predictions"
      onBack={onBack}
    >
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Type</th>
              <th>Days Ago</th>
              <th>Reactions</th>
              <th>Comments</th>
              <th>Analyze</th>
            </tr>
          </thead>
          <tbody>
            {loading && posts.length === 0 ? (
              <tr className="table-empty">
                <td colSpan="6">
                  <span className="loading-spinner sm" /> Loading posts...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr className="table-empty">
                <td colSpan="6">No posts found for this company.</td>
              </tr>
            ) : (
              posts.map((post, index) => (
                <tr key={index}>
                  <td className="engagement-post-cell">{post.content}</td>
                  <td><span className="badge badge-primary">{post.media_type}</span></td>
                  <td className="cell-muted">{post.time_spent}</td>
                  <td>{post.reactions}</td>
                  <td>{post.comments}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedPost({ ...post });
                        setPredictionRequested(true);
                      }}
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EngagementPrediction
        selectedPost={selectedPost}
        isOpen={predictionRequested}
        onClose={() => setPredictionRequested(false)}
      />
    </PageLayout>
  );
}

export default EngagementAnalysis;
