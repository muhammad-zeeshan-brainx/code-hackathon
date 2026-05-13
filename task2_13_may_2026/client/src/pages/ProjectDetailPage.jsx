import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProject, submitClarifications, getExportCsvUrl } from '../api'

function groupTicketsByPrimaryLabel(tickets) {
  const map = new Map()
  for (const t of tickets || []) {
    const primary =
      Array.isArray(t.labels) && t.labels.length > 0 ? t.labels[0] : 'ungrouped'
    if (!map.has(primary)) map.set(primary, [])
    map.get(primary).push(t)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0))
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function buildInitialSelections(project) {
  const out = {}
  const questions = project.clarificationQuestions || []
  const answers = project.clarificationAnswers || []
  const byQ = new Map(answers.map((a) => [a.questionId, a]))
  for (const q of questions) {
    const prev = byQ.get(q.questionId)
    if (prev) {
      out[q.questionId] = {
        choice: prev.choice,
        otherText: prev.otherText || '',
      }
    } else {
      out[q.questionId] = { choice: 'option_0', otherText: '' }
    }
  }
  return out
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selections, setSelections] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const p = await getProject(id)
        if (!cancelled) {
          setProject(p)
          setSelections(buildInitialSelections(p))
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const grouped = useMemo(
    () => (project?.status === 'ready' ? groupTicketsByPrimaryLabel(project.tickets) : []),
    [project]
  )

  async function handleSubmitClarifications(e) {
    e.preventDefault()
    if (!project) return
    setError('')
    setSubmitting(true)
    const answers = project.clarificationQuestions.map((q) => {
      const s = selections[q.questionId] || { choice: 'option_0', otherText: '' }
      return {
        questionId: q.questionId,
        choice: s.choice,
        ...(s.choice === 'other' ? { otherText: s.otherText } : {}),
      }
    })
    try {
      const updated = await submitClarifications(project._id || project.id, answers)
      setProject(updated)
    } catch (err) {
      setError(err.message || 'Failed to generate tickets')
    } finally {
      setSubmitting(false)
    }
  }

  function setChoice(questionId, choice) {
    setSelections((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), choice },
    }))
  }

  function setOtherText(questionId, otherText) {
    setSelections((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), otherText },
    }))
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/projects">Back to projects</Link>
      </div>
    )
  }

  if (!project) return null

  const showClarification =
    project.status === 'pending_clarification' || project.status === 'failed'

  return (
    <div className="page">
      <header className="page-header">
        <nav className="nav-inline">
          <Link to="/projects">All projects</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/">New project</Link>
        </nav>
        <h1>{project.title}</h1>
        <p className="muted">Status: {project.status}</p>
        {project.lastError && project.status === 'failed' ? (
          <p className="error">Last error: {project.lastError}</p>
        ) : null}
      </header>

      <section className="card">
        <h2>Requirements</h2>
        <pre className="requirements-block">{project.requirementsRaw}</pre>
      </section>

      {showClarification ? (
        <form className="card form" onSubmit={handleSubmitClarifications}>
          <h2>Clarifications</h2>
          <p className="muted">Choose an option for each question, or pick Other and describe your own answer.</p>
          {(project.clarificationQuestions || []).map((q) => {
            const s = selections[q.questionId] || { choice: 'option_0', otherText: '' }
            return (
              <fieldset key={q.questionId} className="clarify-fieldset">
                <legend>{q.text}</legend>
                {q.options.map((opt, idx) => {
                  const val = `option_${idx}`
                  return (
                    <label key={val} className="radio-row">
                      <input
                        type="radio"
                        name={q.questionId}
                        value={val}
                        checked={s.choice === val}
                        onChange={() => setChoice(q.questionId, val)}
                        disabled={submitting}
                      />
                      <span>{opt}</span>
                    </label>
                  )
                })}
                <label className="radio-row">
                  <input
                    type="radio"
                    name={q.questionId}
                    value="other"
                    checked={s.choice === 'other'}
                    onChange={() => setChoice(q.questionId, 'other')}
                    disabled={submitting}
                  />
                  <span>Other</span>
                </label>
                {s.choice === 'other' ? (
                  <textarea
                    className="other-input"
                    rows={3}
                    placeholder="Your clarification…"
                    value={s.otherText}
                    onChange={(e) => setOtherText(q.questionId, e.target.value)}
                    disabled={submitting}
                  />
                ) : null}
              </fieldset>
            )
          })}
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? 'Generating tickets…' : 'Submit answers & generate tickets'}
          </button>
        </form>
      ) : null}

      {project.status === 'ready' ? (
        <section className="card">
          <div className="tickets-header">
            <h2>Tickets</h2>
            <a
              className="btn secondary"
              href={getExportCsvUrl(project._id || project.id)}
              download
            >
              Export CSV
            </a>
          </div>
          {grouped.map(([label, tickets]) => (
            <div key={label} className="label-group">
              <h3 className="label-group-title">{label}</h3>
              <ul className="ticket-list">
                {tickets.map((t) => (
                  <li key={t.key} className="ticket-card">
                    <div className="ticket-head">
                      <span className="ticket-key">{t.key}</span>
                      <span className="ticket-type">{t.type}</span>
                      <span className={`priority priority-${t.priority}`}>{t.priority}</span>
                    </div>
                    <h4>{t.title}</h4>
                    <p>{t.description}</p>
                    {t.labels?.length ? (
                      <p className="muted small">Labels: {t.labels.join(', ')}</p>
                    ) : null}
                    {t.dependencies?.length ? (
                      <p className="muted small">Depends on: {t.dependencies.join(', ')}</p>
                    ) : null}
                    {t.acceptanceCriteria?.length ? (
                      <div>
                        <p className="small strong">Acceptance criteria</p>
                        <ul>
                          {t.acceptanceCriteria.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {t.implementationNotes ? (
                      <p className="muted small">
                        <span className="strong">Notes: </span>
                        {t.implementationNotes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
