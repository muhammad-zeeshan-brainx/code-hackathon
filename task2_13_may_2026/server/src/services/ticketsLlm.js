const getOpenAIClient = require("../config/openaiClient");
const { OPENAI_MODEL } = require("../constants/llm");
const { ticketsLlmResponseSchema } = require("../schemas/llmSchemas");
const { parseJsonObject } = require("../utils/parseLlmJson");

const SYSTEM = `You are a technical program manager. You break work into Jira-style tickets for developers.
Respond with a single JSON object only (no markdown fences). Shape:
{"tickets":[{"title":"...","description":"2-5 sentences: goal, behavior, constraints","type":"Story|Task|Bug","priority":"low|medium|high","labels":["area tags like frontend or auth"],"dependencies":["exact title strings of other tickets in THIS list that must be done first, or empty array"],"acceptanceCriteria":["testable criterion 1","criterion 2"],"implementationNotes":"optional concrete hints: layers, APIs, edge cases"}]}
Rules:
- Every ticket must have at least 2 acceptanceCriteria items that are testable.
- dependencies must reference other tickets by their exact "title" string from the same tickets array (not keys). Use [] when none.
- labels: use 1-4 short lowercase labels per ticket (e.g. api, ui, infra, data).
- type Story = user-facing feature slice; Task = engineering work; Bug = defect fix (use Task if not a bug).
- Split into dev-ready tickets; order in the array should reflect a sensible build sequence (dependencies should point backward in that order when possible).
- Cover the full clarified scope implied by the requirements and Q&A.`;

function formatQna(questions, answers) {
  const byId = new Map(questions.map((q) => [q.questionId, q]));
  return answers
    .map((a) => {
      const q = byId.get(a.questionId);
      if (!q) return null;
      let answerLine;
      if (a.choice === "other") {
        answerLine = `Other: ${(a.otherText || "").trim()}`;
      } else {
        const idx = Number(a.choice.replace("option_", ""));
        answerLine = q.options[idx] || a.choice;
      }
      return `Q: ${q.text}\nA: ${answerLine}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildUserPrompt(requirementsText, questions, answers) {
  const qna = formatQna(questions, answers);
  return `Original requirements:\n\n${requirementsText}\n\nClarifications (question and chosen answer):\n\n${qna}\n\nProduce the JSON object with tickets as specified.`;
}

async function callModel(client, messages) {
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.35,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from model");
  }
  return content;
}

function mapTitleToKey(ticketsWithMeta) {
  const titleToKey = new Map();
  for (const t of ticketsWithMeta) {
    const norm = t.title.trim().toLowerCase();
    if (!titleToKey.has(norm)) {
      titleToKey.set(norm, t.key);
    }
  }
  return titleToKey;
}

function normalizeDependencies(deps, titleToKey) {
  if (!Array.isArray(deps)) return [];
  const out = [];
  for (const d of deps) {
    if (typeof d !== "string" || !d.trim()) continue;
    const key = titleToKey.get(d.trim().toLowerCase());
    if (key) out.push(key);
  }
  return [...new Set(out)];
}

function buildPersistedTickets(parsed) {
  const { tickets } = ticketsLlmResponseSchema.parse(parsed);
  const withKeys = tickets.map((t, i) => ({
    ...t,
    key: `TKT-${i + 1}`,
    order: i + 1,
    labels: (t.labels || []).map((l) => String(l).trim()).filter(Boolean),
    acceptanceCriteria: (t.acceptanceCriteria || []).map((s) => String(s).trim()).filter(Boolean),
    dependencies: t.dependencies || [],
    implementationNotes: t.implementationNotes || "",
  }));

  const titleToKey = mapTitleToKey(withKeys);

  return withKeys.map((t) => ({
    key: t.key,
    title: t.title.trim(),
    description: t.description.trim(),
    type: t.type,
    priority: t.priority,
    labels: t.labels,
    dependencies: normalizeDependencies(t.dependencies, titleToKey),
    acceptanceCriteria: t.acceptanceCriteria,
    implementationNotes: t.implementationNotes,
    order: t.order,
  }));
}

async function generateTickets(requirementsText, questions, answers) {
  const client = getOpenAIClient();
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: buildUserPrompt(requirementsText, questions, answers) },
  ];

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await callModel(client, messages);
      const parsed = parseJsonObject(content);
      return buildPersistedTickets(parsed);
    } catch (e) {
      lastErr = e;
      messages.push({
        role: "user",
        content:
          "Your previous output was invalid. Reply with ONLY one JSON object matching: {\"tickets\":[{\"title\",\"description\",\"type\",\"priority\",\"labels\",\"dependencies\",\"acceptanceCriteria\",\"implementationNotes\"}]}. dependencies must use exact ticket titles from your tickets list.",
      });
    }
  }
  throw lastErr || new Error("Failed to generate tickets");
}

module.exports = { generateTickets };
