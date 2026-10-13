 //this is src/components/BarChart.jsx

import React, { useEffect, useState } from 'react'
import '../styles/BarChart.css'

function BarChart({ connectedPlatforms }) {
  const [data, setData] = useState({})

  useEffect(() => {
    if (!connectedPlatforms || connectedPlatforms.length === 0) return

    fetch(`/api/platforms?platforms=${connectedPlatforms.join(',')}`)
      .then(res => res.json())
      .then(setData)
  }, [connectedPlatforms])

  const entries = Object.entries(data)
  const max = Math.max(...entries.map(e => e[1]), 1)

  return (
    <div className="chart-container">
      <h3>Platform-wise Performance</h3>

      {/* <svg width="400" height="200">
        {entries.map(([platform, value], i) => (
          <rect
            key={platform}
            x={i * 100 + 10}
            y={200 - (value / max) * 150}
            width="80"
            height={(value / max) * 150}
            fill="#007bff"
             
          />
          <text 
          {platform}
          ></text>
          // <text
          //   key={platform + '-label'}
          //   x={i * 100 + 50}
          //   y={190}
          //   textAnchor="middle"
          //   fontSize="12"
          //   fill="#333"
          // >
          //   {platform}
          // </text>
        ))}
      </svg> */}

      <svg
        width="400"
        height="200"
        viewBox="0 0 400 200"
        className="bar-chart-svg"
        style={{ width: '100%', height: 'auto', maxHeight: '220px', display: 'block', margin: '0 auto' }}
      >
        {entries.map(([platform, value], i) => (
          <g key={platform}>
            <rect
              x={i * 100 + 10}
              y={200 - (value / max) * 150}
              width="80"
              height={(value / max) * 150}
              //fill="#007bff"
            fill={
              platform === 'Instagram'
                ? '#E1306C'
                : platform === 'Twitter'
                ? '#1DA1F2'
                : '#007bff'
            }

            />

            <text
              x={i * 100 + 50}
              y={190}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
            >
              {platform}
            </text>
          </g>
        ))}
      </svg>



    </div>
  )
}

export default BarChart



// import React, { useEffect, useState } from 'react'
// import '../styles/BarChart.css'

// function BarChart() {
//   const [data, setData] = useState({})
  

//   useEffect(() => {
//    // fetch('/api/platforms')
//    fetch(`/api/platforms?platforms=${connectedPlatforms.join(',')}`)
//       .then(res => res.json())
//       .then(setData)
//   }, []) 

//   const entries = Object.entries(data)
//   const max = Math.max(...entries.map(e => e[1]), 1)

//   return (
//     <div className="chart-container">
      
//       <h3>Platform-wise Performance</h3>
//       <svg width="400" height="200">
//         {entries.map(([platform, value], i) => (
//           <rect
//             key={platform}
//             x={i * 100 + 10}
//             y={200 - (value / max) * 150}
//             width="80"
//             height={(value / max) * 150}
//             fill="#007bff"
//           />
//         ))}
//         {entries.map(([platform], i) => (
//           <text key={platform} x={i * 100 + 50} y={190} textAnchor="middle">
//             {platform}
//           </text>
//         ))}
//       </svg>
//     </div>
//   )
// }

// export default BarChart

