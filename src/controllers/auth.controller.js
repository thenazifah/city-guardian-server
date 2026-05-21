const authService = require("../services/auth.service");
const userService = require("../services/user.service");
const { sendSuccess } = require("../utils/response");
const { validateFirebaseLogin } = require("../validators/auth.validator");

async function firebaseLogin(req, res) {
  const { idToken } = validateFirebaseLogin(req.body);
  const result = await authService.loginWithFirebase(idToken);
  sendSuccess(res, result, "Login successful");
}

async function getMe(req, res) {
  const user = await userService.getUserById(req.user.id);
  sendSuccess(res, user, "Profile retrieved");
}

module.exports = {
  firebaseLogin,
  getMe,
};
