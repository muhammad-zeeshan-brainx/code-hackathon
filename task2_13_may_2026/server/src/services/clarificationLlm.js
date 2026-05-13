const crypto = require("crypto");
const getOpenAIClient = require("../config/openaiClient");
const { OPENAI_MODEL } = require("../constants/llm");
const { clarificationLlmResponseSchema } = require("../schemas/llmSchemas");
const { parseJsonObject } = require("../utils/parseLlmJson");

const SYSTEM = `You are a senior product analyst. Given project requirements, identify vague, ambiguous, or missing areas that would block development planning.
Respond with a single JSON object only (no markdown fences). Shape:
{"questions":[{"text":"clear question for the stakeholder","options":["first plausible answer","second","third","fourth"]}]}
Rules:
- Include between 3 and 12 questions unless the requirements are extremely short (then at least 1).
- Each question must have exactly 4 distinct, plausible options (short phrases or single sentences).
- Questions must be actionable: they resolve real ambiguity in scope, tech, users, integrations, or success criteria.
- Do not ask about information already fully specified unless you need confirmation.`;

function buildUserPrompt(requirementsText) {
  return `Project requirements:\n\n${requirementsText}\n\nProduce the JSON object as specified.`;
}

async function callModel(client, messages) {
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.4,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from model");
  }
  return content;
}

function validateAndShapeQuestions(parsed) {
  const { questions } = clarificationLlmResponseSchema.parse(parsed);
  return questions.map((q) => ({
    questionId: crypto.randomUUID(),
    text: q.text.trim(),
    options: q.options.map((o) => o.trim()),
  }));
}

async function generateClarificationQuestions(requirementsText) {
  const client = getOpenAIClient();
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: buildUserPrompt(requirementsText) },
  ];

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await callModel(client, messages);
      const parsed = parseJsonObject(content);
      return validateAndShapeQuestions(parsed);
    } catch (e) {
      lastErr = e;
      messages.push({
        role: "user",
        content:
          "Your previous output was invalid or did not match the schema. Reply again with ONLY one valid JSON object matching the required shape: {\"questions\":[{\"text\":\"...\",\"options\":[\"a\",\"b\",\"c\",\"d\"]}]}",
      });
    }
  }
  throw lastErr || new Error("Failed to generate clarification questions");
}

module.exports = { generateClarificationQuestions };
