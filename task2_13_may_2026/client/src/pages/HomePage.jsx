import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProject } from '../api'

export default function HomePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [requirements, setRequirements] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Project title is required.')
      return
    }
    if (!requirements.trim() && !file) {
      setError('Paste requirements and/or attach a .txt, .md, or .docx file.')
      return
    }
    setLoading(true)
    try {
      const project = await createProject({ title: title.trim(), requirements, file })
      navigate(`/projects/${project._id}`)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>New project</h1>
        <p className="muted">
          Add requirements as text and/or upload a file. The system will ask clarification
          questions before generating developer tickets.
        </p>
        <nav className="nav-inline">
          <Link to="/projects">All projects</Link>
        </nav>
      </header>

      <form className="card form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Project title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Customer onboarding portal"
            disabled={loading}
          />
        </label>

        <label className="field">
          <span>Requirements (optional if you upload a file)</span>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={12}
            placeholder="Describe goals, users, integrations, constraints…"
            disabled={loading}
          />
        </label>

        <label className="field">
          <span>File (.txt, .md, .docx)</span>
          <input
            type="file"
            accept=".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={loading}
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'Analyzing requirements…' : 'Create & generate questions'}
        </button>
      </form>
    </div>
  )
}
