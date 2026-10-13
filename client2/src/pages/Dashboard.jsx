import React, { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import LineChart from '../components/LineChart';
import BarChart from '../components/BarChart';
import PieChart from '../components/PieChart';
import PageLayout, { createDashboardNav } from '../components/PageLayout';
import '../styles/Dashboard.css';

function Dashboard({ onNavigate, onBack, connectedPlatforms = [] }) {
  const [metrics, setMetrics] = useState({});
  const [recommendation, setRecommendation] = useState(null);

  const activePlatforms = connectedPlatforms.length > 0
    ? connectedPlatforms
    : ['instagram', 'twitter', 'linkedin', 'facebook'];

  useEffect(() => {
    fetch(`/api/analytics?platforms=${activePlatforms.join(',')}`)
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch(() =>
        setMetrics({
          likes: 0,
          comments: 0,
          shares: 0,
          reach: 0,
          engagementRate: '0%'
        })
      );

    fetch('/api/recommendations')
      .then((res) => res.json())
      .then((data) => setRecommendation(data))
      .catch(() => {});
  }, [connectedPlatforms]);

  return (
    <PageLayout
      title="Social Media Analysis Dashboard"
      subtitle="Real-time performance metrics powered dynamically by Conjugate Media"
      onBack={onBack}
      nav={createDashboardNav(onNavigate, 'dashboard')}
      layout="dashboard"
      className="dashboard-page"
    >
      {/* Dynamic Data Sync Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 600 }}>
            Live Feed: Synced with Conjugate Media Platform (Port 5002)
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate('conjugate')}
          title="Open Conjugate Media to add posts, increase likes, or boost subscribers"
        >
          📱 Control Posts & Subscribers in Conjugate Media →
        </button>
      </div>

      <section className="metrics-section">
        <MetricCard title="Total Likes" value={metrics.likes ? metrics.likes.toLocaleString() : 0} />
        <MetricCard title="Total Comments" value={metrics.comments ? metrics.comments.toLocaleString() : 0} />
        <MetricCard title="Total Shares" value={metrics.shares ? metrics.shares.toLocaleString() : 0} />
        <MetricCard title="Total Reach" value={metrics.reach ? metrics.reach.toLocaleString() : 0} />
        <MetricCard title="Engagement Rate" value={metrics.engagementRate || '0%'} />
      </section>

      <section className="visuals-section">
        <LineChart connectedPlatforms={activePlatforms} />
        <BarChart connectedPlatforms={activePlatforms} />
        <PieChart connectedPlatforms={activePlatforms} />
      </section>

      <section className="insights-section">
        <div className="insight-box">
          <h3>Dynamic Insights</h3>
          <p>• {recommendation?.summary || 'Reels with question hooks outperform static posts by 42% in organic reach.'}</p>
          <p>• Optimal Publishing Window: <strong>{recommendation?.time || '6:00 PM – 8:00 PM'}</strong></p>
          <p>• Top Performing Content Type: <strong>{recommendation?.contentType || 'Short Video / Reels (9:16)'}</strong></p>
        </div>
      </section>
    </PageLayout>
  );
}

export default Dashboard;
