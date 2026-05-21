const userService = require("../services/user.service");
const { sendSuccess } = require("../utils/response");
const {
  validateUpdateUser,
  validateUpdateRole,
} = require("../validators/users.validator");
const ApiError = require("../utils/ApiError");

async function listUsers(req, res) {
  const users = await userService.listUsers();
  sendSuccess(res, users, "Users retrieved");
}

async function getUser(req, res) {
  const user = await userService.getUserById(req.params.id);
  sendSuccess(res, user, "User retrieved");
}

async function updateUser(req, res) {
  if (req.params.id !== req.user.id) {
    throw new ApiError(403, "You can only update your own profile");
  }

  const payload = validateUpdateUser(req.body);
  const user = await userService.updateUser(req.params.id, payload);
  sendSuccess(res, user, "User updated");
}

async function updateUserRole(req, res) {
  const { role } = validateUpdateRole(req.body);
  const user = await userService.updateUserRole(req.params.id, role, {
    requesterId: req.user.id,
  });
  sendSuccess(res, user, "User role updated");
}

module.exports = {
  listUsers,
  getUser,
  updateUser,
  updateUserRole,
};
