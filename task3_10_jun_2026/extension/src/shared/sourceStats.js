export function aggregateSourceStats(items = []) {
  const map = new Map();

  for (const item of items) {
    const domain = item.source?.domain || "unknown";
    if (!map.has(domain)) {
      map.set(domain, {
        domain,
        total: 0,
        byType: { notification: 0, popup: 0, dialog: 0 },
        firstBlockedAt: item.blockedAt,
        lastBlockedAt: item.blockedAt,
      });
    }
    const stat = map.get(domain);
    stat.total += 1;
    if (stat.byType[item.type] !== undefined) {
      stat.byType[item.type] += 1;
    }
    stat.firstBlockedAt = Math.min(stat.firstBlockedAt, item.blockedAt);
    stat.lastBlockedAt = Math.max(stat.lastBlockedAt, item.blockedAt);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function formatTypeBreakdown(byType) {
  const parts = [];
  if (byType.notification) parts.push(`${byType.notification} notifications`);
  if (byType.popup) parts.push(`${byType.popup} popups`);
  if (byType.dialog) parts.push(`${byType.dialog} dialogs`);
  return parts.join(" · ") || "0 blocks";
}
