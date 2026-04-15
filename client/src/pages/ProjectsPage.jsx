import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProject, fetchProjects } from '../api'
import '../projects.css'

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(iso)
  }
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setError(null)
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (e) {
      setError(e.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const created = await createProject({ title, instructions })
      setTitle('')
      setInstructions('')
      await load()
      if (created?._id) {
        navigate(`/projects/${created._id}`)
      }
    } catch (err) {
      setError(err.message || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="projects-app">
      <header className="projects-header">
        <h1 className="projects-title">Projects</h1>
        <p className="projects-lead">
          Describe your product requirements. We generate a structured roadmap
          (stacks, APIs, pages, and tickets) using AI.
        </p>
      </header>

      <form className="projects-form" onSubmit={handleSubmit}>
        <label className="projects-label">
          Project title
          <input
            className="projects-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Team task board"
            required
            maxLength={200}
            disabled={submitting}
          />
        </label>
        <label className="projects-label">
          Requirements
          <textarea
            className="projects-textarea"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Paste goals, user stories, constraints—rough notes are fine."
            rows={10}
            required
            disabled={submitting}
          />
        </label>
        {error && <p className="projects-error" role="alert">{error}</p>}
        <button className="projects-submit" type="submit" disabled={submitting}>
          {submitting ? 'Generating roadmap…' : 'Create project'}
        </button>
      </form>

      <section className="projects-list-section">
        <h2 className="projects-h2">Your projects</h2>
        {loading && <p className="projects-muted">Loading…</p>}
        {!loading && projects.length === 0 && (
          <p className="projects-muted">No projects yet. Create one above.</p>
        )}
        <ul className="projects-list">
          {projects.map((p) => (
            <li key={p._id} className="projects-card">
              <Link className="projects-card-link" to={`/projects/${p._id}`}>
                <span className="projects-card-title">{p.title}</span>
                <span className="projects-card-meta">{formatDate(p.createdAt)}</span>
                <p className="projects-card-preview">{p.instructionsPreview}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
