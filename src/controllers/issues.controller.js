const issueService = require("../services/issue.service");
const { sendSuccess } = require("../utils/response");
const {
  validateCreateIssue,
  validateUpdateIssue,
  validateListQuery,
} = require("../validators/issue.validator");

async function createIssue(req, res) {
  const payload = validateCreateIssue(req.body);
  const issue = await issueService.createIssue(req.user.id, payload);
  sendSuccess(res, issue, "Issue created", 201);
}

async function listIssues(req, res) {
  const filters = validateListQuery(req.query);
  const issues = await issueService.listIssues(req.user, filters);
  sendSuccess(res, issues, "Issues retrieved");
}

async function getIssue(req, res) {
  const issue = await issueService.getIssueById(req.params.id, req.user);
  sendSuccess(res, issue, "Issue retrieved");
}

async function updateIssue(req, res) {
  const payload = validateUpdateIssue(req.body);
  const issue = await issueService.updateIssue(req.params.id, payload);
  sendSuccess(res, issue, "Issue updated");
}

async function deleteIssue(req, res) {
  const result = await issueService.deleteIssue(req.params.id);
  sendSuccess(res, result, "Issue deleted");
}

module.exports = {
  createIssue,
  listIssues,
  getIssue,
  updateIssue,
  deleteIssue,
};
