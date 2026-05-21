const ROLES = Object.freeze({
  CITIZEN: "citizen",
  STAFF: "staff",
  ADMIN: "admin",
});

const ROLE_LIST = Object.values(ROLES);

module.exports = {
  ROLES,
  ROLE_LIST,
};
