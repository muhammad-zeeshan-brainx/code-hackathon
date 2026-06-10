import { useEffect, useState } from "react";
import { getState } from "../../shared/storage.js";
import { aggregateSourceStats } from "../../shared/sourceStats.js";
import SourceBreakdown from "../../components/SourceBreakdown.jsx";
import SessionDetail from "../../components/SessionDetail.jsx";

export default function SessionDetailPage() {
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [domainFilter, setDomainFilter] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("sessionId");
    if (!sessionId) return;

    getState().then((state) => {
      const found = state.sessions.find((s) => s.id === sessionId);
      setSession(found || null);
      setItems(state.sessionItems[sessionId] || []);
    });
  }, []);

  if (!session) {
    return <div className="app-page">Session not found.</div>;
  }

  const stats = session.sourceStats || aggregateSourceStats(items);

  return (
    <div className="app-page">
      <h1>Focus session</h1>
      <SourceBreakdown
        stats={stats}
        selectedDomain={domainFilter}
        onSelectDomain={setDomainFilter}
      />
      <SessionDetail
        session={session}
        items={items}
        domainFilter={domainFilter}
        onClearDomainFilter={() => setDomainFilter(null)}
      />
    </div>
  );
}
