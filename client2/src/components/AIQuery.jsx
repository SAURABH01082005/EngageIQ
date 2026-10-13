//this is src/components/AIQuery.jsx

import React, { useState } from 'react'
import '../styles/AIQuery.css'

function AIQuery() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/ai-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: query })
    })
    const data = await res.json()
    setResponse(data.response)
  }

  return (
    <div className="ai-query">
      <h2>AI Query Interface</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
        />
        <button type="submit">Submit</button>
      </form>
      {response && <p>{response}</p>}
    </div>
  )
}

export default AIQuery
