const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
if (!dbUser || !dbPass) {
  console.error("Missing DB_USER or DB_PASS in .env — save .env and restart the server");
  process.exit(1);
}

const uri = `mongodb+srv://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPass)}@cluster0.dwghg78.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const usersCollection = client.db("issueDB").collection("users");

app.get("/", (req, res) => {
  res.send("Server running successfully");
});

app.get("/users", async (req, res) => {
  try {
    const result = await usersCollection.find().toArray();
    res.json(result);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

async function connectMongo() {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("MongoDB connected successfully");
}

connectMongo().catch((err) => {
  console.error("MongoDB connection error:", err.message);
  process.exit(1);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});