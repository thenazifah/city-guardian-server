const { Router } = require("express");
const usersController = require("../controllers/users.controller");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = require("../middleware/auth.middleware");

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(usersController.listUsers));
router.get("/:id", asyncHandler(usersController.getUser));
router.patch("/:id", asyncHandler(usersController.updateUser));

module.exports = router;
