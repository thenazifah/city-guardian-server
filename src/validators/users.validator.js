const ApiError = require("../utils/ApiError");
const { ROLE_LIST } = require("../utils/constants");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCreateUser(body) {
  const errors = [];

  if (!body.email || typeof body.email !== "string") {
    errors.push("email is required");
  } else if (!EMAIL_REGEX.test(body.email.trim())) {
    errors.push("email must be valid");
  }

  if (!body.displayName || typeof body.displayName !== "string") {
    errors.push("displayName is required");
  } else if (body.displayName.trim().length < 2) {
    errors.push("displayName must be at least 2 characters");
  }

  if (body.role !== undefined && !ROLE_LIST.includes(body.role)) {
    errors.push(`role must be one of: ${ROLE_LIST.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return {
    email: body.email,
    displayName: body.displayName,
    role: body.role,
    phone: body.phone,
    avatarUrl: body.avatarUrl,
    firebaseUid: body.firebaseUid,
    isActive: body.isActive,
  };
}

function validateUpdateUser(body) {
  const allowed = ["displayName", "phone", "avatarUrl", "isActive", "role"];
  const hasField = allowed.some((key) => body[key] !== undefined);

  if (!hasField) {
    throw new ApiError(400, `Provide at least one of: ${allowed.join(", ")}`);
  }

  const errors = [];

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== "string" || body.displayName.trim().length < 2) {
      errors.push("displayName must be at least 2 characters");
    }
  }

  if (body.role !== undefined && !ROLE_LIST.includes(body.role)) {
    errors.push(`role must be one of: ${ROLE_LIST.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return body;
}

module.exports = {
  validateCreateUser,
  validateUpdateUser,
};
