const userService = require("../services/user.service");
const { sendSuccess } = require("../utils/response");
const {
  validateUpdateUser,
  validateAdminUpdateUser,
  validateUpdateStatus,
  validateCreateStaff,
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

async function adminUpdateUser(req, res) {
  const payload = validateAdminUpdateUser(req.body);
  const user = await userService.updateUser(req.params.id, payload);
  sendSuccess(res, user, "Staff member updated");
}

async function updateUserStatus(req, res) {
  const { isActive } = validateUpdateStatus(req.body);
  const user = await userService.updateUserStatus(
    req.params.id,
    isActive,
    req.user.id
  );
  sendSuccess(
    res,
    user,
    isActive ? "User unblocked" : "User blocked"
  );
}

async function createStaff(req, res) {
  const payload = validateCreateStaff(req.body);
  const user = await userService.createStaffUser(payload);
  sendSuccess(res, user, "Staff member created", 201);
}

async function deleteStaff(req, res) {
  const result = await userService.deleteStaffUser(
    req.params.id,
    req.user.id
  );
  sendSuccess(res, result, "Staff member removed");
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
  adminUpdateUser,
  updateUserStatus,
  createStaff,
  deleteStaff,
  updateUserRole,
};
