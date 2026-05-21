/**
 * Promote an existing user to admin by email.
 * Usage: node scripts/promote-admin.js user@example.com
 *    or: ADMIN_EMAIL=user@example.com npm run promote-admin
 */
require("dotenv").config({ quiet: true });

const { MongoClient } = require("mongodb");

function buildMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS;
  if (!user || !pass) {
    console.error("Set MONGODB_URI or DB_USER + DB_PASS in .env");
    process.exit(1);
  }

  const host =
    process.env.MONGODB_HOST || "cluster0.dwghg78.mongodb.net";
  const appName = process.env.MONGODB_APP_NAME || "Cluster0";

  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/?appName=${encodeURIComponent(appName)}`;
}

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  if (!email) {
    console.error("Usage: npm run promote-admin -- user@example.com");
    console.error("   or set ADMIN_EMAIL in .env");
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME || "issueDB";
  const client = new MongoClient(buildMongoUri());

  try {
    await client.connect();
    const result = await client
      .db(dbName)
      .collection("users")
      .updateOne(
        { email: email.trim().toLowerCase() },
        { $set: { role: "admin", updatedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      console.error(`No user found with email: ${email}`);
      console.error("Sign in once via Firebase first to create the user record.");
      process.exit(1);
    }

    console.log(`Promoted ${email} to admin`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
