//this is src/components/LineChart.jsx

import React, { useEffect, useState } from 'react'
import '../styles/LineChart.css'

function LineChart({ connectedPlatforms }) {
  const [data, setData] = useState([])
  const [hover, setHover] = useState(null)

  useEffect(() => {
    if (!connectedPlatforms || connectedPlatforms.length === 0) return
   // fetch('/api/engagement-timeline')
   fetch(`/api/engagement-timeline?platforms=${connectedPlatforms.join(',')}`)
      .then(res => res.json())
      .then(setData)
  }, [connectedPlatforms])

  if (data.length === 0) return <p>Loading chart...</p>

  const max = Math.max(...data.map(d => d.engagement))
  const width = 500
  const height = 200
  const padding = 40

  const points = data.map((d, i) => {
    const x =
      padding + (i / (data.length - 1)) * (width - padding * 2)
    const y =
      height - padding - (d.engagement / max) * (height - padding * 2)
    return { ...d, x, y }
  })

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <div className="chart-container">
      <h3>Engagement Over Time</h3>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="line-chart-svg"
        style={{ width: '100%', height: 'auto', maxHeight: '220px', display: 'block', margin: '0 auto' }}
      >
        <path d={path} fill="none" stroke="#0a66c2" strokeWidth="2" />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#0a66c2"
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {hover && (
          <g pointerEvents="none" >
            <rect
              x={hover.x - 60}
              y={hover.y - 90}
              width="120"
              //height="40"
              fill="white"
              stroke="#ccc"
              rx="4"
            />
            {/* <text x={hover.x} y={hover.y - 30} textAnchor="middle" fontSize="10">
              {hover.date}
            </text>
            <text x={hover.x} y={hover.y - 15} textAnchor="middle" fontSize="10">
              Engagement: {hover.engagement}
            </text> */}
            <text x={hover.x} y={hover.y - 30} textAnchor="middle" fontSize="10">
              {hover.date}
            </text>
            <text x={hover.x} y={hover.y - 18} textAnchor="middle" fontSize="10">
              Likes: {hover.likes}
            </text>
            <text x={hover.x} y={hover.y - 8} textAnchor="middle" fontSize="10">
              Comments: {hover.comments}
            </text>
            <text x={hover.x} y={hover.y + 2} textAnchor="middle" fontSize="10">
              Shares: {hover.shares}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

export default LineChart

