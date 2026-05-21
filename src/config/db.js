const { MongoClient, ServerApiVersion } = require("mongodb");
const env = require("./env");

let client = null;
let connected = false;

async function connectDb() {
  if (connected && client) {
    return client;
  }

  client = new MongoClient(env.mongodbUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  await client.db("admin").command({ ping: 1 });
  connected = true;
  console.log("MongoDB connected successfully");
  return client;
}

function getDb(dbName = env.dbName) {
  if (!client || !connected) {
    throw new Error("Database not connected. Call connectDb() first.");
  }
  return client.db(dbName);
}

function isDbConnected() {
  return connected;
}

async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    connected = false;
  }
}

module.exports = {
  connectDb,
  getDb,
  isDbConnected,
  closeDb,
};
