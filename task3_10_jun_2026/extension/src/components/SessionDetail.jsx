import { useMemo, useState } from "react";

const FILTERS = ["all", "notification", "popup", "dialog"];

export default function SessionDetail({ session, items, domainFilter, onClearDomainFilter }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter !== "all" && item.type !== filter) return false;
      if (domainFilter && item.source?.domain !== domainFilter) return false;
      return true;
    });
  }, [items, filter, domainFilter]);

  function formatDate(ts) {
    return new Date(ts).toLocaleString();
  }

  return (
    <div className="card">
      <div className="row">
        <div>
          <h2>Session details</h2>
          <p className="muted">
            {formatDate(session.startedAt)} — {formatDate(session.endedAt)}
          </p>
          <p className="muted">{session.itemCount} blocked · {session.startedBy || "manual"}</p>
        </div>
        <span className={`badge ${session.synced ? "badge-success" : "badge-error"}`}>
          {session.synced ? "Synced" : "Sync failed"}
        </span>
      </div>

      <div className="tabs">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`tab ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {domainFilter && (
        <p className="muted">
          Filtering by: <strong>{domainFilter}</strong>{" "}
          <button type="button" className="btn btn-secondary" onClick={onClearDomainFilter}>
            Clear
          </button>
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="muted">No items match this filter.</p>
      ) : (
        filtered.map((item) => (
          <div key={item.id} className="list-item">
            <div className="row">
              <strong>{item.type}</strong>
              <span className="muted">{formatDate(item.blockedAt)}</span>
            </div>
            <p><strong>{item.source?.domain}</strong></p>
            <p>{item.title || item.body || "—"}</p>
            <p className="muted">{item.source?.pageUrl}</p>
          </div>
        ))
      )}
    </div>
  );
}
