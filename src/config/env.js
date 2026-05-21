require("dotenv").config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function buildMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const user = requireEnv("DB_USER");
  const pass = requireEnv("DB_PASS");
  const host =
    process.env.MONGODB_HOST || "cluster0.dwghg78.mongodb.net";
  const appName = process.env.MONGODB_APP_NAME || "Cluster0";

  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/?appName=${encodeURIComponent(appName)}`;
}

function buildFirebaseConfig() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    return { serviceAccountPath };
  }

  return {
    projectId: requireEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: buildMongoUri(),
  dbName: process.env.MONGODB_DB_NAME || "issueDB",
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  firebase: buildFirebaseConfig(),
};

module.exports = env;
