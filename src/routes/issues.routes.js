const { Router } = require("express");
const issuesController = require("../controllers/issues.controller");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = require("../middleware/auth.middleware");
const optionalAuthenticate = require("../middleware/optionalAuth.middleware");

const router = Router();

router.get(
  "/public",
  optionalAuthenticate,
  asyncHandler(issuesController.listPublicIssues)
);
router.get(
  "/public/:id",
  optionalAuthenticate,
  asyncHandler(issuesController.getPublicIssue)
);

router.use(authenticate);

router.post("/", asyncHandler(issuesController.createIssue));
router.get("/", asyncHandler(issuesController.listIssues));
router.post("/:id/upvote", asyncHandler(issuesController.upvoteIssue));
router.get("/:id", asyncHandler(issuesController.getIssue));

router.patch("/:id", asyncHandler(issuesController.updateIssue));
router.delete("/:id", asyncHandler(issuesController.deleteIssue));

module.exports = router;
