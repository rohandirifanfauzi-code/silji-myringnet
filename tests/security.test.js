const test = require("node:test");
const assert = require("node:assert/strict");

const { hashPassword, verifyPassword } = require("../services/passwordService");

test("verifyPassword accepts bcrypt hashes", () => {
  const hashed = hashPassword("secret123");

  assert.equal(verifyPassword("secret123", hashed), true);
  assert.equal(verifyPassword("wrong", hashed), false);
});

test("verifyPassword rejects plaintext passwords", () => {
  assert.equal(verifyPassword("admin123", "admin123"), false);
});
