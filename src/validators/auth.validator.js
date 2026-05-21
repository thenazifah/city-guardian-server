const ApiError = require("../utils/ApiError");
const env = require("../config/env");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateFirebaseLogin(body) {
  if (!body.idToken || typeof body.idToken !== "string") {
    throw new ApiError(400, "idToken is required");
  }
  return { idToken: body.idToken.trim() };
}

function validateDevLogin(body) {
  if (env.isProduction) {
    throw new ApiError(403, "Dev login is disabled in production");
  }

  if (!body.email || typeof body.email !== "string") {
    throw new ApiError(400, "email is required for dev login");
  }

  if (!EMAIL_REGEX.test(body.email.trim())) {
    throw new ApiError(400, "email must be valid");
  }

  const displayName =
    (typeof body.displayName === "string" && body.displayName.trim()) ||
    (typeof body.name === "string" && body.name.trim()) ||
    body.email.trim().split("@")[0];

  if (displayName.length < 2) {
    throw new ApiError(400, "name or displayName must be at least 2 characters");
  }

  return {
    email: body.email.trim(),
    displayName,
  };
}

module.exports = {
  validateFirebaseLogin,
  validateDevLogin,
};
