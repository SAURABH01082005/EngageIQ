//this is src/components/MetricCard.jsx

import React from 'react'
import '../styles/MetricCard.css'

function MetricCard({ title, value }) {
  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  )
}

export default MetricCard
