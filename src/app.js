const express = require("express");
const cors = require("cors");
const { isDbConnected } = require("./config/db");
const apiRoutes = require("./routes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Server running successfully");
});

module.exports = app;

app.get("/health", (req, res) => {
  const db = isDbConnected() ? "connected" : "disconnected";
  const ok = isDbConnected();

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    db,
  });
});

app.use("/api/v1", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
