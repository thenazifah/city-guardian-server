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
  const allowed = ["displayName", "phone", "avatarUrl"];
  const hasField = allowed.some((key) => body[key] !== undefined);

  if (!hasField) {
    throw new ApiError(400, `Provide at least one of: ${allowed.join(", ")}`);
  }

  if (body.role !== undefined) {
    throw new ApiError(
      400,
      "Use PATCH /users/:id/role to change roles (admin only)"
    );
  }

  const errors = [];

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== "string" || body.displayName.trim().length < 2) {
      errors.push("displayName must be at least 2 characters");
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return {
    displayName: body.displayName,
    phone: body.phone,
    avatarUrl: body.avatarUrl,
  };
}

function validateAdminUpdateUser(body) {
  const allowed = ["displayName", "phone", "avatarUrl"];
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

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return {
    displayName: body.displayName,
    phone: body.phone,
    avatarUrl: body.avatarUrl,
  };
}

function validateUpdateStatus(body) {
  if (body.isActive === undefined || typeof body.isActive !== "boolean") {
    throw new ApiError(400, "isActive (boolean) is required");
  }
  return { isActive: body.isActive };
}

function validateCreateStaff(body) {
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

  if (!body.password || typeof body.password !== "string") {
    errors.push("password is required");
  } else if (body.password.length < 6) {
    errors.push("password must be at least 6 characters");
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return {
    email: body.email.trim().toLowerCase(),
    displayName: body.displayName.trim(),
    phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
    avatarUrl:
      typeof body.avatarUrl === "string" ? body.avatarUrl.trim() || null : null,
    password: body.password,
  };
}

function validateUpdateRole(body) {
  if (!body.role || typeof body.role !== "string") {
    throw new ApiError(400, "role is required");
  }

  if (!ROLE_LIST.includes(body.role)) {
    throw new ApiError(400, `role must be one of: ${ROLE_LIST.join(", ")}`);
  }

  return { role: body.role };
}

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateAdminUpdateUser,
  validateUpdateStatus,
  validateCreateStaff,
  validateUpdateRole,
};
