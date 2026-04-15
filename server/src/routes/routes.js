const express = require("express");
const projectRoutes = require("./projectRoutes");

const router = express.Router();

router.use("/api/projects", projectRoutes);

router.get("/helth", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy",
  });
});

module.exports = router;
