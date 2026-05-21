const { Router } = require("express");
const usersController = require("../controllers/users.controller");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = require("../middleware/auth.middleware");
const { authorize, authorizeSelfOr } = require("../middleware/role.middleware");
const { ROLES } = require("../utils/constants");

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize(ROLES.ADMIN),
  asyncHandler(usersController.listUsers)
);

router.patch(
  "/:id/role",
  authorize(ROLES.ADMIN),
  asyncHandler(usersController.updateUserRole)
);

router.get(
  "/:id",
  authorizeSelfOr(ROLES.ADMIN),
  asyncHandler(usersController.getUser)
);

router.patch("/:id", asyncHandler(usersController.updateUser));

module.exports = router;
