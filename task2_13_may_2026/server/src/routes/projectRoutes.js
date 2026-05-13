const express = require("express");
const multer = require("multer");
const { isValidObjectId } = require("mongoose");
const Project = require("../models/Project");
const { generateClarificationQuestions } = require("../services/clarificationLlm");
const { generateTickets } = require("../services/ticketsLlm");
const {
  mergeRequirementsText,
  extractTextFromUpload,
} = require("../services/extractRequirementsText");
const { clarificationAnswersBodySchema } = require("../schemas/llmSchemas");
const { ticketsToCsvRows } = require("../services/ticketsCsv");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function validateAnswersForProject(project, body) {
  const parsed = clarificationAnswersBodySchema.parse(body);
  const expectedIds = new Set(project.clarificationQuestions.map((q) => q.questionId));
  const seen = new Set();
  for (const a of parsed.answers) {
    if (!expectedIds.has(a.questionId)) {
      throw Object.assign(new Error(`Unknown questionId: ${a.questionId}`), { status: 400 });
    }
    if (seen.has(a.questionId)) {
      throw Object.assign(new Error(`Duplicate answer for questionId: ${a.questionId}`), {
        status: 400,
      });
    }
    seen.add(a.questionId);
  }
  if (seen.size !== expectedIds.size) {
    throw Object.assign(new Error("You must answer every clarification question"), {
      status: 400,
    });
  }
  return parsed.answers.map((a) => ({
    questionId: a.questionId,
    choice: a.choice,
    otherText: a.choice === "other" ? String(a.otherText).trim() : "",
  }));
}

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const title = (req.body.title || "").trim();
    const requirements = (req.body.requirements || "").trim();

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    let fileText = "";
    let sourceFile;
    if (req.file) {
      try {
        fileText = await extractTextFromUpload(req.file);
      } catch (fileErr) {
        return res.status(400).json({ error: fileErr.message || "Invalid file" });
      }
      sourceFile = {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      };
    }

    const requirementsRaw = mergeRequirementsText({
      pasted: requirements,
      fileText,
    });

    if (!requirementsRaw.trim()) {
      return res.status(400).json({
        error: "Provide requirements text and/or a .txt, .md, or .docx file with content",
      });
    }

    const clarificationQuestions = await generateClarificationQuestions(requirementsRaw);

    const project = await Project.create({
      title,
      requirementsRaw,
      sourceFile,
      status: "pending_clarification",
      clarificationQuestions,
      clarificationAnswers: [],
      tickets: [],
      lastError: "",
    });

    return res.status(201).json(project.toJSON());
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large" });
    }
    console.error("POST /projects", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Failed to create project",
    });
  }
});

router.get("/", async (_req, res) => {
  try {
    const projects = await Project.find({})
      .sort({ updatedAt: -1 })
      .select("title status createdAt updatedAt clarificationQuestions tickets")
      .lean();
    return res.json(
      projects.map((p) => ({
        id: p._id,
        title: p.title,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        questionCount: (p.clarificationQuestions || []).length,
        ticketCount: (p.tickets || []).length,
      }))
    );
  } catch (err) {
    console.error("GET /projects", err);
    return res.status(500).json({ error: "Failed to list projects" });
  }
});

router.get("/:id/export.csv", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Project not found" });
    }
    const project = await Project.findById(req.params.id).lean();
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    if (project.status !== "ready" || !project.tickets?.length) {
      return res.status(400).json({ error: "Tickets are not available for export yet" });
    }
    const csv = ticketsToCsvRows(project.tickets);
    const safeName = String(project.title || "project").replace(/[^\w\-]+/g, "_");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_tickets.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error("GET export", err);
    return res.status(500).json({ error: "Failed to export CSV" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Project not found" });
    }
    const project = await Project.findById(req.params.id).lean();
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json({ ...project, id: project._id });
  } catch (err) {
    console.error("GET /projects/:id", err);
    return res.status(500).json({ error: "Failed to load project" });
  }
});

router.post("/:id/clarifications", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Project not found" });
    }
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.status === "ready") {
      return res.status(400).json({ error: "Project already has generated tickets" });
    }

    const answers = validateAnswersForProject(project, req.body);
    project.clarificationAnswers = answers;
    project.lastError = "";
    await project.save();

    try {
      const tickets = await generateTickets(
        project.requirementsRaw,
        project.clarificationQuestions,
        answers
      );
      project.tickets = tickets;
      project.status = "ready";
      await project.save();
      return res.json(project.toJSON());
    } catch (genErr) {
      console.error("Ticket LLM error", genErr);
      project.status = "failed";
      project.lastError = genErr.message || "Ticket generation failed";
      project.tickets = [];
      await project.save();
      return res.status(502).json({
        error: project.lastError,
      });
    }
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Invalid request body", details: err.issues });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("POST clarifications", err);
    return res.status(500).json({ error: err.message || "Unexpected error" });
  }
});

module.exports = router;
