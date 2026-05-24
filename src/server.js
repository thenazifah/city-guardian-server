const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./config/db");
const { initFirebase } = require("./config/firebase");
const { ensureUserIndexes } = require("./services/user.service");
const { ensureIssueIndexes } = require("./services/issue.service");
const { ensureIssueUpdateIndexes } = require("./services/issueTimeline.service");

async function start() {
  try {
    if (env.isProduction || env.firebaseConfigured) {
      initFirebase();
    } else {
      console.warn(
        "Firebase not configured — use POST /api/v1/auth/firebase with email+name (dev only)"
      );
    }

    await connectDb();
    await ensureUserIndexes();
    await ensureIssueIndexes();
    await ensureIssueUpdateIndexes();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
