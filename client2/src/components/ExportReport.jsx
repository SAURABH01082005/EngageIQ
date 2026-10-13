// this is src/components/ExportReport.jsx

import React from 'react'
import '../styles/ExportReport.css'

function ExportReport() {
  const handleExport = () => {
    alert('Report exported successfully (Prototype)')
  }

  return (
    <div className="export-report">
      <button onClick={handleExport}>Export Report</button>
{/* <button
  className="export-btn"
  onClick={() => {
    window.open('/api/export-report', '_blank')
  }}
>
  Export Report
</button>       */}

    </div>
  )
}

export default ExportReport
