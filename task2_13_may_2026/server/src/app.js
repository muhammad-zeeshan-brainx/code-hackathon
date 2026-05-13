const express = require("express");
const cors = require("cors");
const routes = require("./routes/routes");
const apiRoutes = require("./routes/api");

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());
app.use("/api", apiRoutes);
app.use("/", routes);

module.exports = app;
