import React, { useEffect, useState } from 'react'
import PageLayout, { createDashboardNav } from '../components/PageLayout'
import '../styles/Recommendations.css'

function Recommendations({ onNavigate, onBack }) {
  const [rec, setRec] = useState({})

  useEffect(() => {
    fetch('/api/recommendations')
      .then(res => res.json())
      .then(setRec)
      .catch(() => setRec({
        contentType: 'Video Reels',
        time: '6–8 PM weekdays',
        caption: 'Use questions to drive comments',
        frequency: '4–5 posts per week'
      }))
  }, [])

  return (
    <PageLayout
      title="Recommendations & Strategy"
      subtitle="AI-driven suggestions to improve your content performance"
      onBack={onBack}
      nav={createDashboardNav(onNavigate, 'recommendations')}
      layout="dashboard"
      className="recommendations-page"
    >
      <div className="recommendations-grid">
        <div className="recommendation-card">
          <h3>Recommended Content Type</h3>
          <p>{rec.contentType || '—'}</p>
        </div>
        <div className="recommendation-card">
          <h3>Best Time to Post</h3>
          <p>{rec.time || '—'}</p>
        </div>
        <div className="recommendation-card">
          <h3>Caption Strategy</h3>
          <p>{rec.caption || '—'}</p>
        </div>
        <div className="recommendation-card">
          <h3>Posting Frequency</h3>
          <p>{rec.frequency || '—'}</p>
        </div>
      </div>
    </PageLayout>
  )
}

export default Recommendations
