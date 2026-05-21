const ApiError = require("../utils/ApiError");

/**
 * Restrict route to users whose role is in allowedRoles.
 * Must run after authenticate.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }

    next();
  };
}

/**
 * Allow access if :id matches the authenticated user, or role is allowed.
 * Must run after authenticate.
 */
function authorizeSelfOr(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (req.params.id === req.user.id) {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return next(new ApiError(403, "Insufficient permissions"));
  };
}

module.exports = {
  authorize,
  authorizeSelfOr,
};
