const { verifyAccessToken } = require("../services/auth.service");

/**
 * Attaches req.user when a valid Bearer token is present.
 * Does not fail when token is missing (for public routes).
 */
function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = {
      id: payload.userId,
      role: payload.role,
      firebaseUid: payload.firebaseUid,
      email: payload.email,
    };
  } catch {
    // Invalid token on public route — treat as anonymous
  }

  next();
}

module.exports = optionalAuthenticate;
