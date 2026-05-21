const { ObjectId } = require("mongodb");
const { getDb } = require("../config/db");
const ApiError = require("../utils/ApiError");
const { ROLES, ISSUE_STATUS } = require("../utils/constants");

const COLLECTION = "issues";

function issuesCollection() {
  return getDb().collection(COLLECTION);
}

function isStaffOrAdmin(role) {
  return role === ROLES.STAFF || role === ROLES.ADMIN;
}

function toIdString(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value.toString) return value.toString();
  return null;
}

function toPublicIssue(doc) {
  if (!doc) return null;

  const reportedBy = toIdString(
    doc.reportedBy ?? doc.userId ?? doc.reporterId
  );

  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    priority: doc.priority,
    location: doc.location,
    address: doc.address ?? null,
    images: doc.images ?? [],
    reportedBy,
    assignedTo: toIdString(doc.assignedTo),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    resolvedAt: doc.resolvedAt ?? null,
  };
}

async function ensureIssueIndexes() {
  const collection = issuesCollection();
  await collection.createIndex({ reportedBy: 1 });
  await collection.createIndex({ status: 1 });
  await collection.createIndex({ assignedTo: 1 });
  await collection.createIndex({ category: 1 });
  await collection.createIndex({ isDeleted: 1 });
  await collection.createIndex({ location: "2dsphere" });
  console.log("Issue indexes ensured");
}

function buildListFilter(user, query) {
  const filter = { isDeleted: { $ne: true } };

  if (user.role === ROLES.CITIZEN) {
    filter.reportedBy = new ObjectId(user.id);
  }

  if (query.status) {
    filter.status = query.status;
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.assignedTo && isStaffOrAdmin(user.role)) {
    if (!ObjectId.isValid(query.assignedTo)) {
      throw new ApiError(400, "Invalid assignedTo filter");
    }
    filter.assignedTo = new ObjectId(query.assignedTo);
  }

  return filter;
}

async function createIssue(userId, payload) {
  const now = new Date();
  const doc = {
    title: payload.title,
    description: payload.description,
    category: payload.category,
    status: ISSUE_STATUS.OPEN,
    priority: payload.priority,
    location: payload.location,
    address: payload.address,
    images: payload.images,
    reportedBy: new ObjectId(userId),
    assignedTo: null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  };

  const result = await issuesCollection().insertOne(doc);
  return toPublicIssue({ ...doc, _id: result.insertedId });
}

async function listIssues(user, query = {}) {
  const filter = buildListFilter(user, query);
  const issues = await issuesCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
  return issues.map(toPublicIssue);
}

async function getIssueById(id, user) {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid issue id");
  }

  const issue = await issuesCollection().findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  });

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  const reporterId = toIdString(
    issue.reportedBy ?? issue.userId ?? issue.reporterId
  );
  const isOwner = reporterId === user.id;
  if (!isOwner && !isStaffOrAdmin(user.role)) {
    throw new ApiError(403, "You do not have access to this issue");
  }

  return toPublicIssue(issue);
}

async function assertAssigneeExists(assigneeId) {
  if (!ObjectId.isValid(assigneeId)) {
    throw new ApiError(400, "Invalid assignedTo user id");
  }

  const assignee = await getDb()
    .collection("users")
    .findOne({ _id: new ObjectId(assigneeId), isActive: { $ne: false } });

  if (!assignee) {
    throw new ApiError(404, "Assigned user not found");
  }

  if (assignee.role === ROLES.CITIZEN) {
    throw new ApiError(400, "Issues can only be assigned to staff or admin");
  }
}

async function updateIssue(id, payload) {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid issue id");
  }

  const existing = await issuesCollection().findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  });

  if (!existing) {
    throw new ApiError(404, "Issue not found");
  }

  const updates = { updatedAt: new Date() };

  if (payload.status !== undefined) {
    updates.status = payload.status;
    if (payload.status === ISSUE_STATUS.RESOLVED) {
      updates.resolvedAt = new Date();
    } else if (existing.status === ISSUE_STATUS.RESOLVED) {
      updates.resolvedAt = null;
    }
  }

  if (payload.priority !== undefined) {
    updates.priority = payload.priority;
  }

  if (payload.assignedTo !== undefined) {
    if (payload.assignedTo === null) {
      updates.assignedTo = null;
    } else {
      await assertAssigneeExists(payload.assignedTo);
      updates.assignedTo = new ObjectId(payload.assignedTo);
    }
  }

  if (Object.keys(updates).length === 1) {
    throw new ApiError(400, "No valid fields to update");
  }

  const result = await issuesCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updates },
    { returnDocument: "after" }
  );

  return toPublicIssue(result);
}

async function deleteIssue(id) {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid issue id");
  }

  const result = await issuesCollection().findOneAndUpdate(
    { _id: new ObjectId(id), isDeleted: { $ne: true } },
    { $set: { isDeleted: true, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new ApiError(404, "Issue not found");
  }

  return { id: result._id.toString(), deleted: true };
}

module.exports = {
  ensureIssueIndexes,
  createIssue,
  listIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  toPublicIssue,
};
