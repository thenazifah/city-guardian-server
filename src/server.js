const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./config/db");

async function start() {
  try {
    await connectDb();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
