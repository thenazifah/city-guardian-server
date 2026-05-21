const { ObjectId } = require("mongodb");
const { getDb } = require("../config/db");
const ApiError = require("../utils/ApiError");
const { ROLES, ROLE_LIST } = require("../utils/constants");

const COLLECTION = "users";

function usersCollection() {
  return getDb().collection(COLLECTION);
}

async function ensureUserIndexes() {
  const collection = usersCollection();
  await collection.createIndex({ email: 1 }, { unique: true });
  await collection.createIndex(
    { firebaseUid: 1 },
    { unique: true, sparse: true }
  );
  await collection.createIndex({ role: 1 });
  console.log("User indexes ensured");
}

function toPublicUser(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    firebaseUid: doc.firebaseUid ?? null,
    email: doc.email,
    displayName: doc.displayName,
    role: doc.role,
    phone: doc.phone ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listUsers() {
  const users = await usersCollection()
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return users.map(toPublicUser);
}

async function getUserById(id) {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user id");
  }

  const user = await usersCollection().findOne({ _id: new ObjectId(id) });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return toPublicUser(user);
}

async function findByFirebaseUid(firebaseUid) {
  const user = await usersCollection().findOne({ firebaseUid });
  return user ? toPublicUser(user) : null;
}

async function findByEmail(email) {
  const user = await usersCollection().findOne({
    email: email.trim().toLowerCase(),
  });
  return user ? toPublicUser(user) : null;
}

/**
 * Called after Firebase sign-in: link existing email or create new user.
 */
async function findOrCreateFromFirebase({ uid, email, displayName, avatarUrl }) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();

  let existing = await usersCollection().findOne({ firebaseUid: uid });

  if (!existing) {
    existing = await usersCollection().findOne({ email: normalizedEmail });
  }

  if (existing) {
    const updates = { updatedAt: now };
    if (!existing.firebaseUid) {
      updates.firebaseUid = uid;
    }
    if (displayName && existing.displayName !== displayName) {
      updates.displayName = displayName.trim();
    }
    if (avatarUrl && existing.avatarUrl !== avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }

    if (Object.keys(updates).length > 1) {
      const updated = await usersCollection().findOneAndUpdate(
        { _id: existing._id },
        { $set: updates },
        { returnDocument: "after" }
      );
      return toPublicUser(updated);
    }

    return toPublicUser(existing);
  }

  const doc = {
    firebaseUid: uid,
    email: normalizedEmail,
    displayName: (displayName || normalizedEmail.split("@")[0]).trim(),
    role: ROLES.CITIZEN,
    phone: null,
    avatarUrl: avatarUrl || null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await usersCollection().insertOne(doc);
    return toPublicUser({ ...doc, _id: result.insertedId });
  } catch (err) {
    if (err.code === 11000) {
      const linked = await usersCollection().findOne({ firebaseUid: uid });
      if (linked) {
        return toPublicUser(linked);
      }
    }
    throw err;
  }
}

async function createUser(payload) {
  const now = new Date();
  const doc = {
    firebaseUid: payload.firebaseUid ?? null,
    email: payload.email.trim().toLowerCase(),
    displayName: payload.displayName.trim(),
    role: payload.role || ROLES.CITIZEN,
    phone: payload.phone?.trim() || null,
    avatarUrl: payload.avatarUrl?.trim() || null,
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await usersCollection().insertOne(doc);
    return toPublicUser({ ...doc, _id: result.insertedId });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "User with this email or firebaseUid already exists");
    }
    throw err;
  }
}

async function updateUser(id, payload) {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user id");
  }

  const updates = { updatedAt: new Date() };

  if (payload.displayName !== undefined) {
    updates.displayName = payload.displayName.trim();
  }
  if (payload.phone !== undefined) {
    updates.phone = payload.phone?.trim() || null;
  }
  if (payload.avatarUrl !== undefined) {
    updates.avatarUrl = payload.avatarUrl?.trim() || null;
  }
  if (payload.isActive !== undefined) {
    updates.isActive = Boolean(payload.isActive);
  }
  if (payload.role !== undefined) {
    if (!ROLE_LIST.includes(payload.role)) {
      throw new ApiError(400, `Role must be one of: ${ROLE_LIST.join(", ")}`);
    }
    updates.role = payload.role;
  }

  if (Object.keys(updates).length === 1) {
    throw new ApiError(400, "No valid fields to update");
  }

  const result = await usersCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updates },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new ApiError(404, "User not found");
  }

  return toPublicUser(result);
}

module.exports = {
  ensureUserIndexes,
  listUsers,
  getUserById,
  findByFirebaseUid,
  findByEmail,
  findOrCreateFromFirebase,
  createUser,
  updateUser,
  toPublicUser,
};
