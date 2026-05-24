const issueService = require("../services/issue.service");
const { sendSuccess } = require("../utils/response");
const { ROLES } = require("../utils/constants");
const {
  validateCreateIssue,
  validateUpdateIssue,
  validateCitizenUpdateIssue,
  validateListQuery,
} = require("../validators/issue.validator");

async function createIssue(req, res) {
  const payload = validateCreateIssue(req.body);
  const issue = await issueService.createIssue(req.user.id, payload);
  sendSuccess(res, issue, "Issue created", 201);
}

async function listPublicIssues(req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const status = req.query.status || undefined;
  const viewerUserId = req.user?.id;
  const issues = await issueService.listPublicIssues({
    status,
    limit,
    viewerUserId,
  });
  sendSuccess(res, issues, "Public issues retrieved");
}

async function getPublicIssue(req, res) {
  const viewerUserId = req.user?.id;
  const details = await issueService.getPublicIssueDetails(
    req.params.id,
    viewerUserId
  );
  sendSuccess(res, details, "Issue retrieved");
}

async function upvoteIssue(req, res) {
  const issue = await issueService.upvoteIssue(req.params.id, req.user.id);
  sendSuccess(res, issue, "Issue upvoted");
}

async function listIssues(req, res) {
  const filters = validateListQuery(req.query);
  const issues = await issueService.listIssues(req.user, filters);
  sendSuccess(res, issues, "Issues retrieved");
}

async function getIssue(req, res) {
  const details = await issueService.getPublicIssueDetails(
    req.params.id,
    req.user.id
  );
  sendSuccess(res, details, "Issue retrieved");
}

async function updateIssue(req, res) {
  let issue;

  if (req.user.role === ROLES.CITIZEN) {
    const payload = validateCitizenUpdateIssue(req.body);
    issue = await issueService.updateIssueByCitizen(
      req.params.id,
      req.user,
      payload
    );
  } else if (
    req.user.role === ROLES.STAFF ||
    req.user.role === ROLES.ADMIN
  ) {
    const payload = validateUpdateIssue(req.body);
    issue = await issueService.updateIssueByStaff(
      req.params.id,
      req.user,
      payload
    );
  } else {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  sendSuccess(res, issue, "Issue updated");
}

async function deleteIssue(req, res) {
  const result = await issueService.deleteIssue(req.params.id, req.user);
  sendSuccess(res, result, "Issue deleted");
}

module.exports = {
  createIssue,
  listPublicIssues,
  getPublicIssue,
  upvoteIssue,
  listIssues,
  getIssue,
  updateIssue,
  deleteIssue,
};
