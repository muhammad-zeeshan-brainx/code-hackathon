const API_BASE = '';

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function fetchProject(id) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function createProject({ title, instructions }) {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, instructions }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.details || err.error || res.statusText;
    throw new Error(msg);
  }
  return res.json();
}
