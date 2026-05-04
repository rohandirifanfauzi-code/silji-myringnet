const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

function verifyPassword(password, hashedPassword) {
  if (!hashedPassword || !hashedPassword.startsWith("$2")) {
    return false;
  }

  return bcrypt.compareSync(password, hashedPassword);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
