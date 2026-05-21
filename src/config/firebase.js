const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const env = require("./env");

let initialized = false;

function initFirebase() {
  if (initialized) {
    return admin;
  }

  if (env.firebase.serviceAccountPath) {
    const resolved = path.resolve(env.firebase.serviceAccountPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Firebase service account file not found: ${resolved}`);
    }
    const serviceAccount = require(resolved);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
    });
  }

  initialized = true;
  console.log("Firebase Admin initialized");
  return admin;
}

function getAuth() {
  return initFirebase().auth();
}

module.exports = {
  initFirebase,
  getAuth,
};
