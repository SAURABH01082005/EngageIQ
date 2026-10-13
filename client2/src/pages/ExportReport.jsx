import React, { useState } from 'react'
import PageLayout, { createDashboardNav } from '../components/PageLayout'
import '../styles/ExportReport.css'

function ExportReport({ onNavigate, onBack }) {
  const [format, setFormat] = useState('PDF')
  const [message, setMessage] = useState('')

  return (
    <PageLayout
      title="Export Report"
      subtitle="Download your analytics summary"
      onBack={onBack}
      nav={createDashboardNav(onNavigate, 'export')}
      layout="dashboard"
      className="export-report-page"
    >
      <div className="export-grid">
        <div className="export-card">
          <h3>Report Format</h3>
          <p className="export-card__hint">Choose how you want to download your analytics data.</p>
          <div className="form-group">
            <label className="form-label">Export Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="PDF">PDF — formatted summary report</option>
              <option value="CSV">CSV — raw data spreadsheet</option>
            </select>
          </div>
        </div>
        <div className="export-card export-card--action">
          <h3>Generate & Download</h3>
          <p className="export-card__hint">
            Export includes metrics, engagement trends, and platform breakdowns from your connected accounts.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => {
              window.open('/api/export-report', '_blank')
              setMessage(`Report exported successfully as ${format}`)
              setTimeout(() => setMessage(''), 3000)
            }}
          >
            Export as {format}
          </button>
          {message && <div className="toast">{message}</div>}
        </div>
      </div>
    </PageLayout>
  )
}

export default ExportReport
