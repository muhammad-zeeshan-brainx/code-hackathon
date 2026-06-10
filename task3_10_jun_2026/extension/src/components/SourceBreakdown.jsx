import { formatTypeBreakdown } from "../shared/sourceStats.js";

export default function SourceBreakdown({ stats, selectedDomain, onSelectDomain }) {
  if (!stats?.length) {
    return (
      <div className="card">
        <h3>Top disturbance sources</h3>
        <p className="muted">No blocked items in this session.</p>
      </div>
    );
  }

  const maxTotal = stats[0]?.total || 1;

  return (
    <div className="card">
      <h3>Top disturbance sources</h3>
      {stats.map((stat) => (
        <div
          key={stat.domain}
          className="list-item"
          style={{ cursor: "pointer", opacity: selectedDomain && selectedDomain !== stat.domain ? 0.6 : 1 }}
          onClick={() => onSelectDomain(selectedDomain === stat.domain ? null : stat.domain)}
        >
          <div className="row">
            <strong>{stat.domain}</strong>
            <span>{stat.total}</span>
          </div>
          <p className="muted">{formatTypeBreakdown(stat.byType)}</p>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(stat.total / maxTotal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
