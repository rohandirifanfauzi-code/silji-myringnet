const auditModel = require("../models/auditModel");

async function log(req, aksi, tabel, deskripsi = "") {
  try {
    const activeUser = req.user || req.session?.user;
    await auditModel.create({
      user_id: activeUser?.id || null,
      aksi,
      tabel,
      deskripsi,
      created_at: new Date(),
    });
  } catch (error) {
    console.warn("[audit-log] gagal menyimpan audit:", error.message);
  }
}

function auditAction(aksi, tabel, describe) {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const description =
          typeof describe === "function" ? describe(req) : describe || `${aksi} ${tabel}`;
        log(req, aksi, tabel, description);
      }
    });
    next();
  };
}

module.exports = { log, auditAction };
