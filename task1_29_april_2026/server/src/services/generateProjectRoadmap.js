const getOpenAIClient = require("../config/openaiClient");

const ROADMAP_JSON_INSTRUCTIONS = `You must respond with a single JSON object only (no markdown fences). Use this exact shape:
{
  "techStacks": {
    "frontend": "brief description of suggested frontend stack and key libraries",
    "backend": "brief description of suggested backend stack and key services"
  },
  "apisToBuild": [
    {
      "name": "Register user",
      "description": "Create account; body: email, password; returns 201 + user id or errors for duplicate email",
      "method": "POST",
      "path": "/api/auth/register",
      "queryParams": []
    },
    {
      "name": "Login",
      "description": "Issue session or JWT; body: email, password; returns tokens or sets cookie",
      "method": "POST",
      "path": "/api/auth/login",
      "queryParams": []
    },
    {
      "name": "Logout",
      "description": "Invalidate session or clear refresh token",
      "method": "POST",
      "path": "/api/auth/logout",
      "queryParams": []
    },
    {
      "name": "List items",
      "description": "Paginated collection",
      "method": "GET",
      "path": "/api/items",
      "queryParams": [
        { "name": "page", "description": "1-based page" },
        { "name": "limit", "description": "page size" }
      ]
    }
  ],
  "frontendPages": [
    { "name": "Page or route name", "purpose": "why it exists / user goal" }
  ],
  "tickets": {
    "frontend": [
      {
        "title": "string",
        "description": "2-4 sentences: goal, user-facing behavior, and key constraints",
        "order": 1,
        "priority": "low|medium|high optional",
        "acceptanceCriteria": ["bullet 1: observable done condition", "bullet 2"],
        "implementationNotes": "concrete guidance: suggested files/modules, patterns, libraries, API calls to use, edge cases to handle",
        "dependencies": ["names of other tickets or prerequisites that must exist first; empty array if none"],
        "outOfScope": "what this ticket explicitly does NOT include (one short sentence, or empty string)",
        "apisNeeded": ["Exact 'name' strings from apisToBuild in THIS response that the UI must call; empty array only if no HTTP calls"]
      }
    ],
    "backend": [
      {
        "title": "string",
        "description": "2-4 sentences",
        "order": 1,
        "priority": "medium",
        "acceptanceCriteria": ["criterion 1", "criterion 2"],
        "implementationNotes": "routes, services, DB, validation, errors",
        "dependencies": [],
        "outOfScope": "",
        "apisNeeded": ["Exact 'name' strings from apisToBuild in THIS response that this ticket implements or wires end-to-end; must be minimal complete set"]
      }
    ]
  }
}

Rules:
- Infer reasonable stacks and scope even if the user input is vague; state key assumptions briefly inside descriptions where needed.
- apisToBuild: cover every REST/HTTP endpoint the product needs with **fine-grained, one-row-per-endpoint** entries.
- **No combined mega-APIs**: never merge multiple operations into a single apisToBuild object (e.g. do NOT output one item for "Signup/Login" or "CRUD users"). Each distinct method+path+purpose gets its own object with its own "name" (short, specific: e.g. "Register user", "Login", "Request password reset").
- **Authentication & identity**: when auth is required, list **separate** APIs for each flow—at minimum distinct entries for registration/signup, login, logout; add separate entries for refresh token/session renewal, password reset request, password reset confirm, email verification, OAuth callback, etc., only as many as the product needs. Paths should differ per flow (e.g. POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout) unless the spec truly uses one route (rare—still use separate names describing the operation).
- **Other domains** (users, billing, resources): same rule—list GET collection, POST create, GET by id, PATCH update, DELETE as **separate** apisToBuild rows when they are separate HTTP endpoints.
- For every API where query parameters make sense (pagination, filtering, sorting, search, date ranges, feature flags, includes/expands, etc.), you MUST list them in "queryParams" with clear names and short descriptions (type or format when obvious). Use an empty array [] only when the endpoint truly has no query string (e.g. simple POST body-only create). Do not omit query params when they would normally be part of a production API.
- frontendPages should list concrete screens or routes.
- Split tickets into small, dev-ready items; order fields should sequence work sensibly within each array.
- Every ticket MUST include at least 2 acceptanceCriteria items that are testable (what "done" looks like).
- implementationNotes MUST reduce ambiguity: mention likely layers (e.g. routes, services, components), data shapes, validation, auth, and error handling when relevant.
- dependencies should reference other ticket titles in the same list when work must be ordered; use [] if none.
- outOfScope must clarify boundaries so developers do not gold-plate or duplicate work.
- apisNeeded (every ticket): a list of the exact "name" field values from your apisToBuild array in this same JSON object—no invented names, no typos. Frontend tickets: which backend APIs the feature must call. Backend tickets: which APIs from apisToBuild this ticket delivers (implements). Include all APIs required to complete the ticket and none that are irrelevant. Use [] only when truly no API applies (rare for backend tickets that implement HTTP routes).
- Use empty arrays only for apis/frontendPages when truly nothing applies (rare).`;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateRoadmapPayload(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Roadmap payload is not an object");
  }

  const { techStacks, apisToBuild, frontendPages, tickets } = data;

  if (!techStacks || typeof techStacks !== "object") {
    throw new Error("Missing techStacks");
  }
  if (!isNonEmptyString(techStacks.frontend) || !isNonEmptyString(techStacks.backend)) {
    throw new Error("techStacks.frontend and techStacks.backend must be non-empty strings");
  }

  if (!Array.isArray(apisToBuild) || !Array.isArray(frontendPages)) {
    throw new Error("apisToBuild and frontendPages must be arrays");
  }

  function normalizeQueryParams(raw) {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : [];
    const out = [];
    for (const q of list) {
      if (typeof q === "string" && q.trim()) {
        out.push({ name: q.trim(), description: "" });
        continue;
      }
      if (q && typeof q === "object" && isNonEmptyString(q.name)) {
        out.push({
          name: String(q.name).trim(),
          description: q.description != null ? String(q.description).trim() : "",
        });
      }
    }
    return out;
  }

  for (const api of apisToBuild) {
    if (!api || typeof api !== "object" || !isNonEmptyString(api.name)) {
      throw new Error("Each api must have a name");
    }
  }

  function normalizeApisNeeded(raw) {
    const canonical = new Map();
    for (const a of apisToBuild) {
      const n = String(a.name).trim();
      if (!n) continue;
      canonical.set(n.toLowerCase(), n);
    }
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const x of raw) {
      const s = String(x).trim();
      if (!s) continue;
      const resolved = canonical.get(s.toLowerCase());
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        out.push(resolved);
      }
    }
    return out;
  }

  for (const page of frontendPages) {
    if (!page || typeof page !== "object" || !isNonEmptyString(page.name)) {
      throw new Error("Each frontend page must have a name");
    }
  }

  if (!tickets || typeof tickets !== "object") {
    throw new Error("Missing tickets");
  }
  if (!Array.isArray(tickets.frontend) || !Array.isArray(tickets.backend)) {
    throw new Error("tickets.frontend and tickets.backend must be arrays");
  }

  function normalizeTicket(t, i) {
    if (!t || typeof t !== "object" || !isNonEmptyString(t.title)) {
      throw new Error("Each ticket must have a title");
    }
    const acceptanceCriteria = Array.isArray(t.acceptanceCriteria)
      ? t.acceptanceCriteria.map((x) => String(x).trim()).filter(Boolean)
      : [];
    const dependencies = Array.isArray(t.dependencies)
      ? t.dependencies.map((x) => String(x).trim()).filter(Boolean)
      : [];
    return {
      title: String(t.title).trim(),
      description: t.description != null ? String(t.description).trim() : "",
      order: typeof t.order === "number" ? t.order : i + 1,
      priority: t.priority != null ? String(t.priority).trim() : undefined,
      acceptanceCriteria,
      implementationNotes:
        t.implementationNotes != null ? String(t.implementationNotes).trim() : "",
      dependencies,
      outOfScope: t.outOfScope != null ? String(t.outOfScope).trim() : "",
      apisNeeded: normalizeApisNeeded(t.apisNeeded),
    };
  }

  for (const group of [tickets.frontend, tickets.backend]) {
    for (let i = 0; i < group.length; i++) {
      normalizeTicket(group[i], i);
    }
  }

  return {
    techStacks: {
      frontend: techStacks.frontend.trim(),
      backend: techStacks.backend.trim(),
    },
    apisToBuild: apisToBuild.map((a) => ({
      name: String(a.name).trim(),
      description: a.description != null ? String(a.description).trim() : "",
      method: a.method != null ? String(a.method).trim() : undefined,
      path: a.path != null ? String(a.path).trim() : undefined,
      queryParams: normalizeQueryParams(a.queryParams),
    })),
    frontendPages: frontendPages.map((p) => ({
      name: String(p.name).trim(),
      purpose: p.purpose != null ? String(p.purpose).trim() : "",
    })),
    tickets: {
      frontend: tickets.frontend.map((t, i) => normalizeTicket(t, i)),
      backend: tickets.backend.map((t, i) => normalizeTicket(t, i)),
    },
  };
}

async function generateProjectRoadmap({ title, instructions }) {
  const model = process.env.OPENAI_ROADMAP_MODEL || "gpt-4.1";
  const openai = getOpenAIClient();

  const userContent = `Project title: ${title}

Product / requirements (raw user input):
"""
${instructions}
"""

${ROADMAP_JSON_INSTRUCTIONS}`;

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a senior product engineer and tech lead. Given messy or incomplete product requirements, produce a structured development roadmap as JSON. In apisToBuild, emit one entry per HTTP endpoint—never combine signup and login (or other flows) into a single row; split auth and all domains into granular endpoints. Tickets must be detailed enough that a developer can implement without guessing: include acceptance criteria, concrete implementation notes (files, patterns, APIs), dependencies between tickets, explicit out-of-scope lines, and apisNeeded on every ticket listing exact apisToBuild.name values so developers know which endpoints belong to which ticket.",
      },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty model response");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const roadmap = validateRoadmapPayload(parsed);
  roadmap.model = model;
  roadmap.generatedAt = new Date();

  return roadmap;
}

module.exports = {
  generateProjectRoadmap,
  validateRoadmapPayload,
};
