const userModel = require("../models/userModel");
const { hashPassword } = require("./passwordService");

function slugifyUsername(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}

async function generateUniqueUsername(seed) {
  const base = slugifyUsername(seed) || "pelanggan";
  let username = base;
  let counter = 1;

  while (await userModel.findByUsername(username)) {
    username = `${base}${counter}`;
    counter += 1;
  }

  return username;
}

function generatePassword(noHp) {
  const digits = String(noHp || "").replace(/\D/g, "");
  return `MRN${digits.slice(-4) || "1234"}`;
}

async function buildCustomerAccount(pelanggan) {
  const username = await generateUniqueUsername(
    pelanggan.nama || pelanggan.no_hp
  );
  const rawPassword = generatePassword(pelanggan.no_hp);
  return { username, rawPassword, password: hashPassword(rawPassword) };
}

async function buildTechnicianAccount(teknisi) {
  const username = await generateUniqueUsername(teknisi.nama || teknisi.no_hp);
  const rawPassword = generatePassword(teknisi.no_hp);
  return { username, rawPassword, password: hashPassword(rawPassword) };
}

async function syncCustomerAccount(pelanggan) {
  const existing = await userModel.findByPelangganId(pelanggan.id);
  if (!existing) {
    const credentials = await buildCustomerAccount(pelanggan);
    const userId = await userModel.create({
      username: credentials.username,
      password: credentials.password,
      role: "pelanggan",
    });
    return { userId, ...credentials };
  }

  return { userId: existing.id, username: existing.username, password: existing.password };
}

module.exports = {
  buildCustomerAccount,
  buildTechnicianAccount,
  syncCustomerAccount,
};
