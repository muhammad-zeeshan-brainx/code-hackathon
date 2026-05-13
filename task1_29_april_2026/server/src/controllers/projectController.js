const Project = require("../models/Project");
const { generateProjectRoadmap } = require("../services/generateProjectRoadmap");

const PREVIEW_LEN = 200;

function truncateInstructions(text) {
  if (!text || text.length <= PREVIEW_LEN) return text;
  return `${text.slice(0, PREVIEW_LEN)}…`;
}

async function createProject(req, res) {
  const { title, instructions } = req.body || {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (!instructions || typeof instructions !== "string" || !instructions.trim()) {
    return res.status(400).json({ error: "instructions is required" });
  }

  let roadmap;
  try {
    roadmap = await generateProjectRoadmap({
      title: title.trim(),
      instructions: instructions.trim(),
    });
  } catch (err) {
    const code = err?.status ?? err?.response?.status;
    const message = err?.message || "Failed to generate roadmap";
    const status = code === 429 || /rate limit/i.test(message) ? 503 : 502;
    return res.status(status).json({
      error: "Could not generate project roadmap",
      details: message,
    });
  }

  try {
    const project = await Project.create({
      title: title.trim(),
      instructions: instructions.trim(),
      roadmap,
    });
    return res.status(201).json(project.toObject());
  } catch (err) {
    return res.status(500).json({ error: "Failed to save project" });
  }
}

async function listProjects(req, res) {
  try {
    const rows = await Project.find()
      .sort({ createdAt: -1 })
      .select("title instructions createdAt")
      .lean();

    const list = rows.map((p) => ({
      _id: p._id,
      title: p.title,
      createdAt: p.createdAt,
      instructionsPreview: truncateInstructions(p.instructions),
    }));

    return res.json(list);
  } catch {
    return res.status(500).json({ error: "Failed to list projects" });
  }
}

async function getProject(req, res) {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(project);
  } catch {
    return res.status(400).json({ error: "Invalid project id" });
  }
}

module.exports = {
  createProject,
  listProjects,
  getProject,
};
