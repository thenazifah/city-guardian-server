const { Router } = require("express");
const issuesController = require("../controllers/issues.controller");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { ROLES } = require("../utils/constants");

const router = Router();

router.use(authenticate);

router.post("/", asyncHandler(issuesController.createIssue));
router.get("/", asyncHandler(issuesController.listIssues));
router.get("/:id", asyncHandler(issuesController.getIssue));

router.patch(
  "/:id",
  authorize(ROLES.STAFF, ROLES.ADMIN),
  asyncHandler(issuesController.updateIssue)
);

router.delete(
  "/:id",
  authorize(ROLES.ADMIN),
  asyncHandler(issuesController.deleteIssue)
);

module.exports = router;
