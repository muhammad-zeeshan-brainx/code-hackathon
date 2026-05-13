function escapeCsvField(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ticketsToCsvRows(tickets) {
  const headers = [
    "key",
    "title",
    "type",
    "priority",
    "labels",
    "dependencies",
    "acceptanceCriteria",
    "implementationNotes",
    "description",
  ];
  const lines = [headers.join(",")];
  for (const t of tickets) {
    const row = [
      t.key,
      t.title,
      t.type,
      t.priority,
      (t.labels || []).join(";"),
      (t.dependencies || []).join(";"),
      (t.acceptanceCriteria || []).join(" | "),
      t.implementationNotes || "",
      t.description || "",
    ].map(escapeCsvField);
    lines.push(row.join(","));
  }
  return lines.join("\r\n");
}

module.exports = { ticketsToCsvRows };
