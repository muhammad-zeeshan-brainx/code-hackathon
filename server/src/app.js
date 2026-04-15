const express = require("express");
const cors = require("cors");
const routes = require("./routes/routes");

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: [clientOrigin, /^http:\/\/localhost:\d+$/],
    credentials: false,
  })
);
app.use(express.json());
app.use("/", routes);

module.exports = app;
