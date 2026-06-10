import { useEffect, useState } from "react";
import { MSG } from "../shared/constants.js";

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function ActiveSession({ state, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const active = state.activeSession;

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  async function handleStart() {
    setLoading(true);
    setError("");
    const result = await chrome.runtime.sendMessage({ type: MSG.START_SESSION });
    setLoading(false);
    if (!result?.ok) setError(result?.error || "Failed to start session.");
    else onRefresh();
  }

  async function handleStop() {
    setLoading(true);
    setError("");
    const result = await chrome.runtime.sendMessage({ type: MSG.STOP_SESSION });
    setLoading(false);
    if (!result?.ok) setError(result?.error || "Failed to stop session.");
    else onRefresh();
  }

  if (!active) {
    return (
      <div className="card">
        <h2>Focus mode</h2>
        <p className="muted">Block notifications and popups while you focus.</p>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-block" onClick={handleStart} disabled={loading}>
          {loading ? "Starting..." : "Start Focus"}
        </button>
      </div>
    );
  }

  const elapsed = now - active.startedAt;
  const recent = active.items.slice(-5).reverse();

  return (
    <div className="card">
      <div className="row">
        <h2>Focus active</h2>
        <span className="badge badge-success">ON</span>
      </div>
      <p className="muted">Elapsed: {formatDuration(elapsed)}</p>
      <p>Blocked: <strong>{active.items.length}</strong></p>
      {recent.length > 0 && (
        <>
          <p className="muted">Latest blocks</p>
          {recent.map((item) => (
            <div key={item.id} className="list-item">
              <strong>{item.type}</strong> — {item.source?.domain}
              <div className="muted">{item.title || item.body || "—"}</div>
            </div>
          ))}
        </>
      )}
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-danger btn-block" onClick={handleStop} disabled={loading}>
        {loading ? "Stopping..." : "Stop Focus"}
      </button>
    </div>
  );
}
