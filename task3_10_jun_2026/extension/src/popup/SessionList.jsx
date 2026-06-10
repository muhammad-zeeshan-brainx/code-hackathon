import { useState } from "react";
import { MSG } from "../shared/constants.js";

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

function formatDuration(start, end) {
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function SessionList({ state, onRefresh }) {
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");

  async function handleDelete(sessionId) {
    if (!confirm("Delete this focus session?")) return;
    setLoadingId(sessionId);
    setError("");
    const result = await chrome.runtime.sendMessage({
      type: MSG.DELETE_SESSION,
      sessionId,
    });
    setLoadingId(null);
    if (!result?.ok) setError(result?.error || "Delete failed.");
    else onRefresh();
  }

  async function handleRetry(sessionId) {
    setLoadingId(sessionId);
    setError("");
    const result = await chrome.runtime.sendMessage({
      type: MSG.RETRY_SYNC,
      sessionId,
    });
    setLoadingId(null);
    if (!result?.ok) setError(result?.error || "Sync failed.");
    else onRefresh();
  }

  function openDetails(sessionId) {
    const url = chrome.runtime.getURL(
      `src/pages/session-detail/index.html?sessionId=${sessionId}`
    );
    chrome.tabs.create({ url });
  }

  if (!state.sessions.length) {
    return (
      <div className="card">
        <p className="muted">No past focus sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Past sessions</h3>
      {error && <p className="error-text">{error}</p>}
      {state.sessions.map((session) => (
        <div key={session.id} className="list-item">
          <div className="row">
            <div>
              <strong>{formatDate(session.startedAt)}</strong>
              <div className="muted">
                {formatDuration(session.startedAt, session.endedAt)} · {session.itemCount} blocked
              </div>
            </div>
            <span className={`badge ${session.synced ? "badge-success" : "badge-error"}`}>
              {session.synced ? "Synced" : "Sync failed"}
            </span>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => openDetails(session.id)}>
              View details
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {!session.synced && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleRetry(session.id)}
                  disabled={loadingId === session.id}
                >
                  Retry
                </button>
              )}
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(session.id)}
                disabled={loadingId === session.id}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
