const ApiError = require("../utils/ApiError");

function validateFirebaseLogin(body) {
  if (!body.idToken || typeof body.idToken !== "string") {
    throw new ApiError(400, "idToken is required");
  }
  return { idToken: body.idToken.trim() };
}

module.exports = {
  validateFirebaseLogin,
};
