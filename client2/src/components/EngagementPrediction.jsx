import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import "./EngagementPrediction.css";

function EngagementPrediction({ selectedPost, isOpen, onClose }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedPost && isOpen) {
      setPrediction(null);
      setError(null);
      handleAnalyze();
    }
  }, [selectedPost, isOpen]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      let followers, postText, postType, reactions, comments, daysSincePosted, platform;
      let durationSec = 0;
      let aspectRatio = "1:1";
      let hasSubtitles = false;
      let hookRating = 7;

      if (selectedPost.specificContent) {
        postText =
          selectedPost.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "";
        const createdTime = selectedPost.created?.time;
        daysSincePosted = createdTime
          ? Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24))
          : 0;
        followers = 10000;
        postType = "text";
        reactions = 0;
        comments = 0;
        platform = "linkedin";
      } else {
        followers = parseInt(selectedPost.followers || selectedPost.subscribers) || 10000;
        postText = selectedPost.content || selectedPost.caption || selectedPost.text || selectedPost.title || "";
        postType = (selectedPost.media_type || selectedPost.postType || selectedPost.post_type || "text").toLowerCase();
        reactions = parseInt(selectedPost.reactions || selectedPost.likes) || 0;
        comments = parseInt(selectedPost.comments) || 0;
        daysSincePosted =
          parseInt(selectedPost.daysSincePosted) || parseInt(selectedPost.time_spent) || 0;
        platform = (selectedPost.platform || "instagram").toLowerCase().replace("x", "twitter");
        durationSec = Number(selectedPost.durationSec || selectedPost.duration_sec || (postType.includes("video") || postType.includes("reel") ? 28 : 0));
        aspectRatio = selectedPost.aspectRatio || selectedPost.aspect_ratio || (durationSec > 0 && durationSec <= 65 ? "9:16" : "1:1");
        hasSubtitles = selectedPost.hasSubtitles === true || selectedPost.has_subtitles === true || (durationSec > 0);
        hookRating = Number(selectedPost.hookRating || selectedPost.hook_rating || 8);
      }

      const userEmail = localStorage.getItem("userEmail") || "default_user";

      const payload = {
        followers,
        postText,
        caption: postText,
        title: postText.split("\n")[0].slice(0, 80),
        postType,
        reactions,
        comments,
        daysSincePosted,
        platform,
        userEmail,
        durationSec,
        aspectRatio,
        hasSubtitles,
        hookRating,
        hour_of_day: new Date().getHours(),
        day_of_week: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()]
      };

      const data = await apiService.ai.predictEngagement(payload);
      setPrediction(data);
    } catch (err) {
      console.error("Error predicting engagement:", err);
      setError("Failed to analyze engagement. Please ensure the EngageIQ server is running.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal prediction-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="engagement-prediction-card">
          <div className="prediction-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>⚡ Two-Stage Post ML Analysis</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Model A (Trending Prior) + Model B (Personal Lift)
                </span>
              </div>
              {prediction?.breakoutRating && (
                <span className="tier-badge" style={{
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '0.78rem'
                }}>
                  {prediction.breakoutRating}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="prediction-loading">
              <span className="loading-spinner" />
              Evaluating Content Prior (Model A) & Personal Lift (Model B)...
            </div>
          ) : error ? (
            <div className="prediction-content">
              <div className="alert alert-error">{error}</div>
              <button type="button" className="btn btn-primary" onClick={handleAnalyze}>
                Retry Analysis
              </button>
            </div>
          ) : prediction ? (
            <div className="prediction-content">
              {/* Score Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))',
                  border: '2px solid rgba(168, 85, 247, 0.5)',
                  boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)'
                }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                    {prediction.engagementScore || 85}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase' }}>/100</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Personalized Engagement Potential
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                    {prediction.growth || 'HIGH'} Growth Velocity ({prediction.confidence || 90}% confidence)
                  </div>
                  {prediction.viralityIndex && (
                    <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                      🔥 Virality Index: <strong>{Number(prediction.viralityIndex).toLocaleString()} pts</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Two-Stage Mathematical Breakdown */}
              {prediction.twoStageBreakdown && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginTop: '0.25rem'
                }}>
                  <div style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.06)',
                    border: '1px solid rgba(56, 189, 248, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                      Model A: Content Prior
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', margin: '0.15rem 0' }}>
                      {prediction.modelAScore ?? prediction.twoStageBreakdown.model_A_content_prior?.score ?? '—'}
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>/100</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', margin: '0.15rem 0' }}>
                      {prediction.twoStageBreakdown.model_A_content_prior.breakout >= 0 ? '+' : ''}
                      {prediction.twoStageBreakdown.model_A_content_prior.breakout} Breakout
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Quality: {(prediction.twoStageBreakdown.model_A_content_prior.quality * 100).toFixed(1)}% reaction rate
                    </div>
                  </div>

                  <div style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(168, 85, 247, 0.06)',
                    border: '1px solid rgba(168, 85, 247, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>
                      Model B: Personal Lift
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc', margin: '0.15rem 0' }}>
                      {prediction.modelBScore ?? prediction.twoStageBreakdown.model_B_personal_lift?.score ?? '—'}
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>/100</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', margin: '0.15rem 0' }}>
                      {prediction.twoStageBreakdown.model_B_personal_lift.breakout_lift >= 0 ? '+' : ''}
                      {prediction.twoStageBreakdown.model_B_personal_lift.breakout_lift} Lift
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Taste Affinity: {prediction.twoStageBreakdown.model_B_personal_lift.platform_taste_affinity}
                    </div>
                  </div>
                </div>
              )}

              {/* Scoring Algorithm (Notebook Composite) */}
              {prediction.scoringAlgorithm && (
                <div style={{
                  marginTop: '0.6rem',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(34, 197, 94, 0.05)',
                  border: '1px solid rgba(34, 197, 94, 0.18)',
                  fontSize: '0.72rem',
                  color: '#94a3b8'
                }}>
                  <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Scoring Algorithm
                  </div>
                  <div style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {prediction.scoringAlgorithm.formula}
                  </div>
                  {prediction.scoringAlgorithm.components && (
                    <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span>er_s={prediction.scoringAlgorithm.components.er_s}</span>
                      <span>qrr_s={prediction.scoringAlgorithm.components.qrr_s}</span>
                      <span>vir_s={prediction.scoringAlgorithm.components.vir_s}</span>
                      <span>brk_s={prediction.scoringAlgorithm.components.brk_s}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Metrics Block */}
              <div className="metric-block" style={{ padding: '0.85rem 1rem' }}>
                <div className="metric-icon">🔢</div>
                <div style={{ width: '100%' }}>
                  <div className="metric-label">Estimated Post Performance</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="metric-value">
                      ~{Number(prediction.expectedReactions || 0).toLocaleString()} Total Engagements
                    </span>
                    {prediction.expectedMetrics?.reach && (
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        Reach: ~{Number(prediction.expectedMetrics.reach).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Explanations & Suggestions */}
              <div className="explanation-block">
                <div className="explanation-header">
                  <span className="explanation-icon">🧠</span>
                  <span className="explanation-title">Strategic Insights & Suggestions:</span>
                </div>
                <ul className="explanation-list">
                  {(prediction.reasons || []).map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>

              {prediction.bestPostingTime && (
                <div style={{
                  padding: '0.65rem 0.95rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>⏰</span>
                  <span>Optimal Scheduling: <strong style={{ color: '#f8fafc' }}>{prediction.bestPostingTime}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div className="prediction-content">
              <button type="button" className="btn btn-primary btn-block" onClick={handleAnalyze}>
                Analyze Engagement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EngagementPrediction;
