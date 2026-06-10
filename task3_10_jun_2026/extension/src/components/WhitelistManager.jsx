import { useState } from "react";
import { validateDomain } from "../shared/whitelist.js";

export default function WhitelistManager({ whitelist, onChange }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    const result = validateDomain(input);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    if (whitelist.includes(result.domain)) {
      setError("Domain already in whitelist.");
      return;
    }
    setError("");
    onChange([...whitelist, result.domain]);
    setInput("");
  }

  function handleRemove(domain) {
    onChange(whitelist.filter((d) => d !== domain));
  }

  return (
    <div className="card">
      <h3>Notification whitelist</h3>
      <p className="muted">
        Notifications from these domains will not be blocked during focus mode. Popups and dialogs are still blocked.
      </p>
      <div className="row">
        <input
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="slack.com"
        />
        <button type="button" className="btn btn-secondary" onClick={handleAdd}>
          Add
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {whitelist.length === 0 ? (
        <p className="muted">No whitelisted domains.</p>
      ) : (
        whitelist.map((domain) => (
          <div key={domain} className="list-item row">
            <span>{domain}</span>
            <button type="button" className="btn btn-danger" onClick={() => handleRemove(domain)}>
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}
