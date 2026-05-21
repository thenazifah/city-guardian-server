const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = require("../middleware/auth.middleware");

const router = Router();

router.post("/firebase", asyncHandler(authController.firebaseLogin));
router.get("/me", authenticate, asyncHandler(authController.getMe));

module.exports = router;
