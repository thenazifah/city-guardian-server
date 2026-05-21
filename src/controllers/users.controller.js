const userService = require("../services/user.service");
const { sendSuccess } = require("../utils/response");
const { validateUpdateUser } = require("../validators/users.validator");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../utils/constants");

async function listUsers(req, res) {
  const users = await userService.listUsers();
  sendSuccess(res, users, "Users retrieved");
}

async function getUser(req, res) {
  if (req.params.id !== req.user.id && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(403, "You can only view your own profile");
  }
  const user = await userService.getUserById(req.params.id);
  sendSuccess(res, user, "User retrieved");
}

async function updateUser(req, res) {
  if (req.params.id !== req.user.id) {
    throw new ApiError(403, "You can only update your own profile");
  }

  const payload = validateUpdateUser(req.body);

  if (payload.role !== undefined && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(403, "Only admins can change roles");
  }

  const user = await userService.updateUser(req.params.id, payload);
  sendSuccess(res, user, "User updated");
}

module.exports = {
  listUsers,
  getUser,
  updateUser,
};
