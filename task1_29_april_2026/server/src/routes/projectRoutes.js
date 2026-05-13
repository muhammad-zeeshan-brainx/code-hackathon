const express = require("express");
const {
  createProject,
  listProjects,
  getProject,
} = require("../controllers/projectController");

const router = express.Router();

router.post("/", createProject);
router.get("/", listProjects);
router.get("/:id", getProject);

module.exports = router;
