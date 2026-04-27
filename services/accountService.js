const userModel = require("../models/userModel");

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
    pelanggan.email?.split("@")[0] || pelanggan.nama
  );
  const password = generatePassword(pelanggan.no_hp);
  return { username, password };
}

async function syncCustomerAccount(pelanggan) {
  const existing = await userModel.findByPelangganId(pelanggan.id);
  if (!existing) {
    const credentials = await buildCustomerAccount(pelanggan);
    const userId = await userModel.create({
      username: credentials.username,
      password: credentials.password,
      role: "pelanggan",
      nama: pelanggan.nama,
      pelanggan_id: pelanggan.id,
      teknisi_id: null,
    });
    return { userId, ...credentials };
  }

  await userModel.update(existing.id, {
    nama: pelanggan.nama,
  });

  return { userId: existing.id, username: existing.username, password: existing.password };
}

module.exports = {
  buildCustomerAccount,
  syncCustomerAccount,
};
