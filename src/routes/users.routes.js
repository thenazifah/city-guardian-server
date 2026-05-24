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

router.post(
  "/staff",
  authorize(ROLES.ADMIN),
  asyncHandler(usersController.createStaff)
);

router.patch(
  "/:id/role",
  authorize(ROLES.ADMIN),
  asyncHandler(usersController.updateUserRole)
);

router.patch(
  "/:id/status",
  authorize(ROLES.ADMIN),
  asyncHandler(usersController.updateUserStatus)
);

router.patch(
  "/:id/admin",
  authorize(ROLES.ADMIN),
  asyncHandler(usersController.adminUpdateUser)
);

router.get(
  "/:id",
  authorizeSelfOr(ROLES.ADMIN),
  asyncHandler(usersController.getUser)
);

router.patch("/:id" , asyncHandler(usersController.updateUser));

router.delete(
  "/:id",
  authorize(ROLES.ADMIN),
  asyncHandler(usersController.deleteStaff)
);

module.exports = router;
