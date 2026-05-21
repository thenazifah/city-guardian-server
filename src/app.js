const express = require("express");
const cors = require("cors");
const { isDbConnected } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  const db = isDbConnected() ? "connected" : "disconnected";
  const ok = isDbConnected();

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    db,
  });
});

module.exports = app;
