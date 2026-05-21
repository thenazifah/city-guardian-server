const { Router } = require("express");
const authRoutes = require("./auth.routes");
const usersRoutes = require("./users.routes");
const issuesRoutes = require("./issues.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/issues", issuesRoutes);

module.exports = router;
