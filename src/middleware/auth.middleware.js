const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../services/auth.service");

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(
      new ApiError(401, "Missing or invalid Authorization header (Bearer token)")
    );
  }

  const token = header.slice(7);
  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.userId,
    role: payload.role,
    firebaseUid: payload.firebaseUid,
    email: payload.email,
  };

  next();
}

module.exports = authenticate;
