function stripCodeFences(text) {
  const trimmed = String(text).trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im;
  const m = trimmed.match(fence);
  if (m) return m[1].trim();
  return trimmed;
}

function parseJsonObject(content) {
  const raw = stripCodeFences(content);
  return JSON.parse(raw);
}

module.exports = { parseJsonObject, stripCodeFences };
