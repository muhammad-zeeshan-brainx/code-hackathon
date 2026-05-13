const API_BASE = '/api'

async function parseError(res) {
  let msg = res.statusText
  try {
    const data = await res.json()
    if (data?.error) msg = data.error
  } catch {
    // ignore
  }
  return msg
}

export async function createProject({ title, requirements, file }) {
  const form = new FormData()
  form.append('title', title)
  if (requirements?.trim()) form.append('requirements', requirements.trim())
  if (file) form.append('file', file)

  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function listProjects() {
  const res = await fetch(`${API_BASE}/projects`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getProject(id) {
  const res = await fetch(`${API_BASE}/projects/${id}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function submitClarifications(projectId, answers) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/clarifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export function getExportCsvUrl(projectId) {
  return `${API_BASE}/projects/${projectId}/export.csv`
}
