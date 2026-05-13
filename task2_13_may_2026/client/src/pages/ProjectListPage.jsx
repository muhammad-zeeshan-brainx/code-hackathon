import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProjects } from '../api'

const statusLabel = {
  pending_clarification: 'Awaiting answers',
  ready: 'Tickets ready',
  failed: 'Generation failed',
}

export default function ProjectListPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listProjects()
        if (!cancelled) setProjects(data)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <header className="page-header">
        <h1>Projects</h1>
        <nav className="nav-inline">
          <Link to="/">New project</Link>
        </nav>
      </header>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && projects.length === 0 ? (
        <p className="muted">No projects yet. <Link to="/">Create one</Link>.</p>
      ) : null}

      <ul className="project-list">
        {projects.map((p) => (
          <li key={p.id} className="project-list-item">
            <Link to={`/projects/${p.id}`} className="project-link">
              <span className="project-title">{p.title}</span>
              <span className="project-meta">
                {statusLabel[p.status] || p.status} · {p.questionCount} questions
                {p.ticketCount ? ` · ${p.ticketCount} tickets` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
