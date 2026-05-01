const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, hashedPassword) {
  if (!hashedPassword || !hashedPassword.startsWith("scrypt$")) {
    return password === hashedPassword;
  }

  const [, salt, storedHash] = hashedPassword.split("$");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(derived, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

module.exports = {
  hashPassword,
  verifyPassword,
};
