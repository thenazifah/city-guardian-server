const ROLES = Object.freeze({
  CITIZEN: "citizen",
  STAFF: "staff",
  ADMIN: "admin",
});

const ROLE_LIST = Object.values(ROLES);

const ISSUE_STATUS = Object.freeze({
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  WORKING: "working",
  RESOLVED: "resolved",
  CLOSED: "closed",
  REJECTED: "rejected",
});

const STAFF_STATUS_FLOW = Object.freeze([
  ISSUE_STATUS.OPEN,
  ISSUE_STATUS.IN_PROGRESS,
  ISSUE_STATUS.WORKING,
  ISSUE_STATUS.RESOLVED,
  ISSUE_STATUS.CLOSED,
]);

const ISSUE_STATUS_LIST = Object.values(ISSUE_STATUS);

const ISSUE_PRIORITY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

const ISSUE_PRIORITY_LIST = Object.values(ISSUE_PRIORITY);

const ISSUE_CATEGORIES = Object.freeze([
  "pothole",
  "lighting",
  "sanitation",
  "graffiti",
  "traffic",
  "other",
]);

module.exports = {
  ROLES,
  ROLE_LIST,
  ISSUE_STATUS,
  ISSUE_STATUS_LIST,
  STAFF_STATUS_FLOW,
  ISSUE_PRIORITY,
  ISSUE_PRIORITY_LIST,
  ISSUE_CATEGORIES,
};
