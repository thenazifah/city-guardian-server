const { ObjectId } = require("mongodb");
const { getDb } = require("../config/db");
const { ISSUE_STATUS } = require("../utils/constants");

const COLLECTION = "issue_updates";

function updatesCollection() {
  return getDb().collection(COLLECTION);
}

const STATUS_MESSAGES = {
  [ISSUE_STATUS.OPEN]: "Issue submitted and awaiting review",
  [ISSUE_STATUS.IN_PROGRESS]: "Staff moved this issue to in progress",
  [ISSUE_STATUS.WORKING]: "Staff is actively working on this issue",
  [ISSUE_STATUS.RESOLVED]: "Issue marked as resolved",
  [ISSUE_STATUS.CLOSED]: "Issue was closed",
  [ISSUE_STATUS.REJECTED]: "Issue was rejected",
};

async function ensureIssueUpdateIndexes() {
  const collection = updatesCollection();
  await collection.createIndex({ issueId: 1, createdAt: -1 });
  console.log("Issue update indexes ensured");
}

function formatTimelineEntry(doc) {
  return {
    id: doc._id.toString(),
    issueId: doc.issueId.toString(),
    fromStatus: doc.fromStatus ?? null,
    toStatus: doc.toStatus,
    message: doc.message,
    changedBy: doc.changedBy.toString(),
    changedByName: doc.changedByName,
    changedByRole: doc.changedByRole,
    createdAt: doc.createdAt,
  };
}

async function appendIssueUpdate({
  issueId,
  fromStatus = null,
  toStatus,
  message,
  user,
}) {
  const doc = {
    issueId: new ObjectId(issueId),
    fromStatus,
    toStatus,
    message:
      message ||
      STATUS_MESSAGES[toStatus] ||
      `Status updated to ${toStatus}`,
    changedBy: new ObjectId(user.id),
    changedByName: user.displayName || user.email || "System",
    changedByRole: user.role,
    createdAt: new Date(),
  };

  const result = await updatesCollection().insertOne(doc);
  return formatTimelineEntry({ ...doc, _id: result.insertedId });
}

async function getIssueTimeline(issueId) {
  if (!ObjectId.isValid(issueId)) {
    return [];
  }

  const entries = await updatesCollection()
    .find({ issueId: new ObjectId(issueId) })
    .sort({ createdAt: -1 })
    .toArray();

  return entries.map(formatTimelineEntry);
}

module.exports = {
  ensureIssueUpdateIndexes,
  appendIssueUpdate,
  getIssueTimeline,
  STATUS_MESSAGES,
};
