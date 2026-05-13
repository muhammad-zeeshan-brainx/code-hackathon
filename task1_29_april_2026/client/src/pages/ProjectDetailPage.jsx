import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProject } from '../api'
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

function findApiByName(apis, name) {
  if (!Array.isArray(apis) || !name) return null
  const n = String(name).trim().toLowerCase()
  return apis.find((a) => String(a.name).trim().toLowerCase() === n) ?? null
}

function TicketDetailItem({ ticket, index, apis }) {
  const order = typeof ticket.order === 'number' ? ticket.order : index + 1
  const criteria = Array.isArray(ticket.acceptanceCriteria)
    ? ticket.acceptanceCriteria
    : []
  const deps = Array.isArray(ticket.dependencies) ? ticket.dependencies : []
  const apisNeeded = Array.isArray(ticket.apisNeeded) ? ticket.apisNeeded : []

  return (
    <li className="projects-ticket">
      <div className="projects-ticket-head">
        <span className="projects-ticket-order" aria-hidden="true">
          #{order}
        </span>
        <span className="projects-ticket-title">{ticket.title}</span>
        {ticket.priority && (
          <span className="projects-priority">{ticket.priority}</span>
        )}
      </div>
      {ticket.description && (
        <p className="projects-ticket-desc">{ticket.description}</p>
      )}
      {apisNeeded.length > 0 && (
        <div className="projects-ticket-block">
          <h4 className="projects-ticket-h4">APIs from roadmap</h4>
          <p className="projects-ticket-apis-lead">
            Use these entries from <strong>APIs to build</strong> for this ticket:
          </p>
          <ul className="projects-ticket-apis-list">
            {apisNeeded.map((name) => {
              const api = findApiByName(apis, name)
              return (
                <li key={name}>
                  <code className="projects-queryparam-name">{name}</code>
                  {api?.method && api?.path && (
                    <span className="projects-api-path">
                      {' '}
                      ({api.method} {api.path})
                    </span>
                  )}
                  {api?.description && (
                    <span className="projects-item-desc"> — {api.description}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {criteria.length > 0 && (
        <div className="projects-ticket-block">
          <h4 className="projects-ticket-h4">Acceptance criteria</h4>
          <ul className="projects-criteria-list">
            {criteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {ticket.implementationNotes && (
        <div className="projects-ticket-block">
          <h4 className="projects-ticket-h4">Implementation notes</h4>
          <p className="projects-ticket-notes">{ticket.implementationNotes}</p>
        </div>
      )}
      {deps.length > 0 && (
        <div className="projects-ticket-block">
          <h4 className="projects-ticket-h4">Dependencies</h4>
          <ul className="projects-deps-list">
            {deps.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {ticket.outOfScope && (
        <div className="projects-ticket-block projects-ticket-out">
          <h4 className="projects-ticket-h4">Out of scope</h4>
          <p className="projects-ticket-notes">{ticket.outOfScope}</p>
        </div>
      )}
    </li>
  )
}

function ProjectDetailBody({ projectId }) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchProject(projectId)
      .then((data) => {
        if (!cancelled) setProject(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load project')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="projects-app projects-detail">
        <p className="projects-muted">Loading…</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="projects-app projects-detail">
        <p className="projects-error" role="alert">{error || 'Not found'}</p>
        <Link className="projects-back" to="/projects">← Back to projects</Link>
      </div>
    )
  }

  const { roadmap } = project
  const tech = roadmap?.techStacks || {}
  const apis = roadmap?.apisToBuild || []
  const pages = roadmap?.frontendPages || []
  const feTickets = roadmap?.tickets?.frontend || []
  const beTickets = roadmap?.tickets?.backend || []

  return (
    <div className="projects-app projects-detail">
      <Link className="projects-back" to="/projects">← Back to projects</Link>

      <header className="projects-detail-header">
        <h1 className="projects-title">{project.title}</h1>
        <p className="projects-meta">
          Created {formatDate(project.createdAt)}
          {roadmap?.model && (
            <span className="projects-meta-badge"> · Model: {roadmap.model}</span>
          )}
        </p>
      </header>

      <section className="projects-section">
        <h2 className="projects-h2">User requirements</h2>
        <pre className="projects-requirements">{project.instructions}</pre>
      </section>

      <section className="projects-section">
        <h2 className="projects-h2">Tech stacks</h2>
        <div className="projects-grid-2">
          <div className="projects-stack">
            <h3 className="projects-h3">Frontend</h3>
            <p>{tech.frontend || '—'}</p>
          </div>
          <div className="projects-stack">
            <h3 className="projects-h3">Backend</h3>
            <p>{tech.backend || '—'}</p>
          </div>
        </div>
      </section>

      <section className="projects-section">
        <h2 className="projects-h2">APIs to build</h2>
        <ul className="projects-bullet-list projects-api-list">
          {apis.map((api, i) => {
            const qp = Array.isArray(api.queryParams) ? api.queryParams : []
            return (
              <li key={`${api.name}-${i}`}>
                <strong>{api.name}</strong>
                {api.method && api.path && (
                  <span className="projects-api-path">
                    {' '}
                    ({api.method} {api.path})
                  </span>
                )}
                {api.description && (
                  <span className="projects-item-desc"> — {api.description}</span>
                )}
                {qp.length > 0 && (
                  <div className="projects-api-queryparams">
                    <span className="projects-api-queryparams-label">Query params</span>
                    <ul className="projects-queryparam-list">
                      {qp.map((q, j) => (
                        <li key={j}>
                          <code className="projects-queryparam-name">{q.name}</code>
                          {q.description && (
                            <span className="projects-item-desc"> — {q.description}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="projects-section">
        <h2 className="projects-h2">Frontend pages</h2>
        <ul className="projects-bullet-list">
          {pages.map((pg, i) => (
            <li key={`${pg.name}-${i}`}>
              <strong>{pg.name}</strong>
              {pg.purpose && (
                <span className="projects-item-desc"> — {pg.purpose}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="projects-section">
        <h2 className="projects-h2">Tickets — Frontend</h2>
        <ul className="projects-tickets">
          {feTickets.map((t, i) => (
            <TicketDetailItem key={`fe-${i}`} ticket={t} index={i} apis={apis} />
          ))}
        </ul>
      </section>

      <section className="projects-section">
        <h2 className="projects-h2">Tickets — Backend</h2>
        <ul className="projects-tickets">
          {beTickets.map((t, i) => (
            <TicketDetailItem key={`be-${i}`} ticket={t} index={i} apis={apis} />
          ))}
        </ul>
      </section>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  return <ProjectDetailBody key={projectId} projectId={projectId} />
}
