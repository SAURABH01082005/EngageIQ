//this is src/components/ContentComparison.jsx

import React from 'react'
import '../styles/ContentComparison.css'

function ContentComparison() {
  const data = [
    { format: 'Reels', performance: 'High' },
    { format: 'Carousels', performance: 'Medium' },
    { format: 'Static Posts', performance: 'Low' }
  ]

  return (
    <div className="content-comparison">
      <h2>Content Format Comparison</h2>
      {data.map(item => (
        <div key={item.format} className="comparison-item">
          <span>{item.format}</span>
          <span>{item.performance}</span>
        </div>
      ))}
    </div>
  )
}

export default ContentComparison
