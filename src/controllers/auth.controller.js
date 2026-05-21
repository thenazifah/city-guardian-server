const authService = require("../services/auth.service");
const userService = require("../services/user.service");
const env = require("../config/env");
const { sendSuccess } = require("../utils/response");
const {
  validateFirebaseLogin,
  validateDevLogin,
} = require("../validators/auth.validator");

async function firebaseLogin(req, res) {
  let result;

  if (req.body.idToken) {
    const { idToken } = validateFirebaseLogin(req.body);
    result = await authService.loginWithFirebase(idToken);
    sendSuccess(res, result, "Login successful");
    return;
  }

  if (env.isDevelopment) {
    const payload = validateDevLogin(req.body);
    result = await authService.loginWithDev(payload);
    sendSuccess(res, result, "Login successful (dev mode)");
    return;
  }

  validateFirebaseLogin(req.body);
}

async function getMe(req, res) {
  const user = await userService.getUserById(req.user.id);
  sendSuccess(res, user, "Profile retrieved");
}

module.exports = {
  firebaseLogin,
  getMe,
};
