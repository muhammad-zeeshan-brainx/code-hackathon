import { API_BASE_URL } from "./constants.js";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
}

export function registerUser(name, email) {
  return request("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ name, email }),
  });
}

export function updateUserSettings(userId, settings) {
  return request(`/api/users/${userId}/settings`, {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}

export function syncFocusSession(payload) {
  return request("/api/focus-sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteFocusSession(backendId) {
  return request(`/api/focus-sessions/${backendId}`, {
    method: "DELETE",
  });
}

export function getSessionItems(backendId) {
  return request(`/api/focus-sessions/${backendId}/items`);
}
