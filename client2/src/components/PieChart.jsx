//this is src/components/PieChart.jsx

import React, { useEffect, useState } from 'react'
import '../styles/PieChart.css'

function PieChart({ connectedPlatforms }) {
  const [data, setData] = useState(null)

  useEffect(() => {
     if (!connectedPlatforms || connectedPlatforms.length === 0) return

    //fetch('/api/sentiment')
    fetch(`/api/sentiment?platforms=${connectedPlatforms.join(',')}`)
      .then(res => res.json())
      .then(setData)
  }, [connectedPlatforms])

  if (!data) return <p>Loading sentiment chart...</p>

  const total = data.positive + data.neutral + data.negative

  const segments = [
    { label: 'Positive', value: data.positive, color: '#28a745' },
    { label: 'Neutral', value: data.neutral, color: '#ffc107' },
    { label: 'Negative', value: data.negative, color: '#dc3545' }
  ]

  let cumulative = 0

  const radius = 80
  const center = 100

  const polarToCartesian = (cx, cy, r, angle) => {
    const rad = (angle - 90) * Math.PI / 180.0
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    }
  }

  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, r, endAngle)
    const end = polarToCartesian(cx, cy, r, startAngle)
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1'

    return [
      'M', cx, cy,
      'L', start.x, start.y,
      'A', r, r, 0, largeArc, 0, end.x, end.y,
      'Z'
    ].join(' ')
  }

  return (
    <div className="chart-container">
      <h3>Sentiment Distribution</h3>

      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="pie-chart-svg"
        style={{ width: '100%', height: 'auto', maxHeight: '200px', display: 'block', margin: '0 auto' }}
      >
        {segments.map((seg, i) => {
          const startAngle = (cumulative / total) * 360
          const endAngle =
            ((cumulative + seg.value) / total) * 360
          cumulative += seg.value

          return (
            <path
              key={i}
              d={describeArc(center, center, radius, startAngle, endAngle)}
              fill={seg.color}
            />
          )
        })}
      </svg>

      <div className="legend">
        {segments.map((seg, i) => (
          <div key={i} className="legend-item">
            <span
              className="legend-color"
              style={{ background: seg.color }}
            />
            {seg.label}: {seg.value}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PieChart


