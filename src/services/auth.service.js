const jwt = require("jsonwebtoken");
const { getAuth } = require("../config/firebase");
const env = require("../config/env");
const userService = require("./user.service");
const ApiError = require("../utils/ApiError");

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      firebaseUid: user.firebaseUid,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Token expired");
    }
    throw new ApiError(401, "Invalid token");
  }
}

async function loginWithFirebase(idToken) {
  if (!env.firebaseConfigured) {
    throw new ApiError(
      503,
      "Firebase is not configured. Use email+name login in development."
    );
  }

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch (err) {
    throw new ApiError(401, "Invalid Firebase ID token");
  }

  if (!decoded.email) {
    throw new ApiError(400, "Firebase account must include an email");
  }

  const user = await userService.findOrCreateFromFirebase({
    uid: decoded.uid,
    email: decoded.email,
    displayName: decoded.name || decoded.email.split("@")[0],
    avatarUrl: decoded.picture || null,
  });

  if (!user.isActive) {
    throw new ApiError(403, "Account is disabled");
  }

  const accessToken = signAccessToken(user);
  return { accessToken, user };
}

/**
 * Development-only: create/link user by email without Firebase.
 * Uses synthetic firebaseUid `dev:<email>`.
 */
async function loginWithDev({ email, displayName }) {
  if (env.isProduction) {
    throw new ApiError(403, "Dev login is disabled in production");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const uid = `dev:${normalizedEmail}`;

  const user = await userService.findOrCreateFromFirebase({
    uid,
    email: normalizedEmail,
    displayName,
    avatarUrl: null,
  });

  if (!user.isActive) {
    throw new ApiError(403, "Account is disabled");
  }

  const accessToken = signAccessToken(user);
  return { accessToken, user, devMode: true };
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  loginWithFirebase,
  loginWithDev,
};
