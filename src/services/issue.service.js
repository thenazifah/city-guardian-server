const { ObjectId } = require("mongodb");
const { getDb } = require("../config/db");
const ApiError = require("../utils/ApiError");
const {
  ROLES,
  ISSUE_STATUS,
  STAFF_STATUS_FLOW,
} = require("../utils/constants");
const {
  appendIssueUpdate,
  getIssueTimeline,
} = require("./issueTimeline.service");

const COLLECTION = "issues";

function issuesCollection() {
  return getDb().collection(COLLECTION);
}

async function getUserBrief(userId) {
  const user = await getDb()
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  if (!user) {
    return {
      id: userId,
      role: ROLES.CITIZEN,
      displayName: "User",
      email: "",
    };
  }

  return {
    id: userId,
    role: user.role,
    displayName: user.displayName,
    email: user.email,
  };
}

function toPublicAssignee(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    displayName: doc.displayName,
    email: doc.email,
    role: doc.role,
    avatarUrl: doc.avatarUrl ?? null,
    phone: doc.phone ?? null,
  };
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

function userHasUpvoted(doc, viewerUserId) {
  if (!viewerUserId || !doc.upvotedBy?.length) {
    return false;
  }
  return doc.upvotedBy.some((id) => id.toString() === viewerUserId);
}

function toPublicIssue(doc, viewerUserId) {
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
    upvoteCount: doc.upvoteCount ?? 0,
    hasUpvoted: userHasUpvoted(doc, viewerUserId),
    isOwnIssue: viewerUserId ? reportedBy === viewerUserId : false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    resolvedAt: doc.resolvedAt ?? null,
  };
}

const PRIORITY_SORT_ORDER = { high: 0, medium: 1, low: 2 };

function sortIssuesForPublicFeed(issues) {
  return [...issues].sort((a, b) => {
    const pa = PRIORITY_SORT_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_SORT_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;

    const upvoteDiff = (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0);
    if (upvoteDiff !== 0) return upvoteDiff;

    return new Date(b.createdAt) - new Date(a.createdAt);
  });
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

  if (query.mine && user.role === ROLES.STAFF) {
    filter.assignedTo = new ObjectId(user.id);
  }

  return filter;
}

function getNextStaffStatus(currentStatus) {
  const index = STAFF_STATUS_FLOW.indexOf(currentStatus);
  if (index < 0 || index >= STAFF_STATUS_FLOW.length - 1) {
    return null;
  }
  return STAFF_STATUS_FLOW[index + 1];
}

const MAX_CITIZEN_ISSUES = 3;

async function createIssue(userId, payload) {
  const reporterDoc = await getDb()
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  if (reporterDoc?.isActive === false) {
    throw new ApiError(
      403,
      "Your account is disabled. Contact support to restore access."
    );
  }

  const existingCount = await issuesCollection().countDocuments({
    reportedBy: new ObjectId(userId),
    isDeleted: { $ne: true },
  });

  if (existingCount >= MAX_CITIZEN_ISSUES) {
    throw new ApiError(
      403,
      "Free accounts are limited to 3 issue reports. Contact support if you need more."
    );
  }

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
    upvoteCount: 0,
    upvotedBy: [],
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  };

  const result = await issuesCollection().insertOne(doc);
  const issueId = result.insertedId.toString();
  const reporter = await getUserBrief(userId);

  await appendIssueUpdate({
    issueId,
    toStatus: ISSUE_STATUS.OPEN,
    message: "Citizen reported this infrastructure issue",
    user: reporter,
  });

  return toPublicIssue({ ...doc, _id: result.insertedId }, userId);
}

async function listIssues(user, query = {}) {
  const filter = buildListFilter(user, query);
  const issues = await issuesCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
  return issues.map((doc) => toPublicIssue(doc, user?.id));
}

/** Public feed for homepage and all-issues page (auth optional for hasUpvoted). */
async function listPublicIssues({ status, limit = 6, viewerUserId } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 100);
  const filter = { isDeleted: { $ne: true } };

  if (status) {
    filter.status = status;
  }

  const docs = await issuesCollection().find(filter).toArray();

  let sorted;
  if (status === ISSUE_STATUS.RESOLVED) {
    sorted = [...docs].sort(
      (a, b) =>
        new Date(b.resolvedAt || b.updatedAt) -
        new Date(a.resolvedAt || a.updatedAt)
    );
  } else {
    sorted = sortIssuesForPublicFeed(docs);
  }

  return sorted.slice(0, safeLimit).map((doc) => toPublicIssue(doc, viewerUserId));
}

async function upvoteIssue(id, userId) {
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

  if (reporterId === userId) {
    throw new ApiError(403, "You cannot upvote your own issue");
  }

  const alreadyUpvoted = (issue.upvotedBy || []).some(
    (uid) => uid.toString() === userId
  );

  if (alreadyUpvoted) {
    throw new ApiError(409, "You have already upvoted this issue");
  }

  const result = await issuesCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $addToSet: { upvotedBy: new ObjectId(userId) },
      $inc: { upvoteCount: 1 },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  return toPublicIssue(result, userId);
}

async function getPublicIssueDetails(id, viewerUserId) {
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

  let assignee = null;
  if (issue.assignedTo) {
    const staffDoc = await getDb()
      .collection("users")
      .findOne({ _id: issue.assignedTo });
    assignee = toPublicAssignee(staffDoc);
  }

  let timeline = await getIssueTimeline(id);
  if (timeline.length === 0) {
    timeline = [
      {
        id: "bootstrap",
        issueId: id,
        fromStatus: null,
        toStatus: issue.status,
        message: "Issue reported to City Guardian",
        changedBy: toIdString(issue.reportedBy),
        changedByName: "Citizen",
        changedByRole: ROLES.CITIZEN,
        createdAt: issue.createdAt,
      },
    ];
  }

  return {
    issue: toPublicIssue(issue, viewerUserId),
    assignee,
    timeline,
  };
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

  return toPublicIssue(issue, user.id);
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

async function updateIssueByStaff(id, user, payload) {
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

  if (user.role === ROLES.STAFF) {
    const assignedId = toIdString(existing.assignedTo);
    if (assignedId !== user.id) {
      throw new ApiError(403, "You can only update issues assigned to you");
    }
  }

  const updates = { updatedAt: new Date() };
  const actor = await getUserBrief(user.id);

  if (payload.status !== undefined) {
    if (user.role === ROLES.STAFF) {
      const nextStatus = getNextStaffStatus(existing.status);
      if (!nextStatus || payload.status !== nextStatus) {
        throw new ApiError(
          400,
          nextStatus
            ? `Status can only advance to: ${nextStatus}`
            : "This issue has reached its final status"
        );
      }
    }

    if (
      user.role === ROLES.ADMIN &&
      payload.status === ISSUE_STATUS.REJECTED &&
      existing.status !== ISSUE_STATUS.OPEN
    ) {
      throw new ApiError(400, "Only pending issues can be rejected");
    }

    updates.status = payload.status;
    if (
      payload.status === ISSUE_STATUS.RESOLVED ||
      payload.status === ISSUE_STATUS.CLOSED
    ) {
      updates.resolvedAt = new Date();
    } else if (
      existing.status === ISSUE_STATUS.RESOLVED ||
      existing.status === ISSUE_STATUS.CLOSED
    ) {
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

  if (payload.status !== undefined && payload.status !== existing.status) {
    await appendIssueUpdate({
      issueId: id,
      fromStatus: existing.status,
      toStatus: payload.status,
      message: `${actor.role === ROLES.ADMIN ? "Admin" : "Staff"} changed status from ${existing.status} to ${payload.status}`,
      user: actor,
    });
  }

  if (payload.assignedTo !== undefined) {
    const msg =
      payload.assignedTo === null
        ? "Staff assignment was removed"
        : "A staff member was assigned to this issue";
    await appendIssueUpdate({
      issueId: id,
      fromStatus: result.status,
      toStatus: result.status,
      message: msg,
      user: actor,
    });
  }

  return toPublicIssue(result, user.id);
}

async function updateIssueByCitizen(id, user, payload) {
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

  const reporterId = toIdString(
    existing.reportedBy ?? existing.userId ?? existing.reporterId
  );

  if (reporterId !== user.id) {
    throw new ApiError(403, "You can only edit your own issues");
  }

  if (existing.status !== ISSUE_STATUS.OPEN) {
    throw new ApiError(400, "Only pending (open) issues can be edited");
  }

  const updates = { updatedAt: new Date() };

  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.location !== undefined) updates.location = payload.location;
  if (payload.address !== undefined) updates.address = payload.address;
  if (payload.images !== undefined) updates.images = payload.images;

  const result = await issuesCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updates },
    { returnDocument: "after" }
  );

  const actor = await getUserBrief(user.id);
  await appendIssueUpdate({
    issueId: id,
    fromStatus: existing.status,
    toStatus: existing.status,
    message: "Citizen updated the report details",
    user: actor,
  });

  return toPublicIssue(result, user.id);
}

async function deleteIssue(id, user) {
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

  const reporterId = toIdString(
    existing.reportedBy ?? existing.userId ?? existing.reporterId
  );
  const isOwner = reporterId === user.id;
  const isAdmin = user.role === ROLES.ADMIN;

  if (!isAdmin && (!isOwner || existing.status !== ISSUE_STATUS.OPEN)) {
    throw new ApiError(
      403,
      "You can only delete your own issues while they are still pending"
    );
  }

  const result = await issuesCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { isDeleted: true, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  const actor = await getUserBrief(user.id);
  await appendIssueUpdate({
    issueId: id,
    fromStatus: existing.status,
    toStatus: existing.status,
    message: isAdmin
      ? "Admin removed this issue from public view"
      : "Citizen deleted this pending report",
    user: actor,
  });

  return { id: result._id.toString(), deleted: true };
}

module.exports = {
  ensureIssueIndexes,
  createIssue,
  listIssues,
  listPublicIssues,
  upvoteIssue,
  getPublicIssueDetails,
  getIssueById,
  updateIssueByStaff,
  updateIssueByCitizen,
  deleteIssue,
  toPublicIssue,
};
