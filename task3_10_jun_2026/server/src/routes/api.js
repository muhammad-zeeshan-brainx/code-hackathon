const express = require("express");
const { registerUser, updateSettings } = require("../controllers/userController");
const {
  createSession,
  listSessions,
  getSessionItems,
  deleteSession,
} = require("../controllers/focusSessionController");

const router = express.Router();

router.post("/users/register", registerUser);
router.patch("/users/:userId/settings", updateSettings);

router.post("/focus-sessions", createSession);
router.get("/focus-sessions", listSessions);
router.get("/focus-sessions/:id/items", getSessionItems);
router.delete("/focus-sessions/:id", deleteSession);

module.exports = router;
