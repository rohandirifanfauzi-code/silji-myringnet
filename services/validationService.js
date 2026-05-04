function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function isValidPhone(value) {
  return /^(?:\+62|62|0)8[0-9]{7,13}$/.test(String(value || "").trim());
}

function isPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isValidDateInput(value) {
  if (isBlank(value)) {
    return false;
  }
  return !Number.isNaN(new Date(value).getTime());
}

function isValidEmail(value) {
  if (isBlank(value)) {
    return true;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function collectErrors(rules) {
  return rules.filter(Boolean);
}

function validateLogin(payload = {}) {
  return collectErrors([
    isBlank(payload.username) && "Username wajib diisi.",
    isBlank(payload.password) && "Password wajib diisi.",
  ]);
}

function validatePelanggan(payload = {}) {
  return collectErrors([
    isBlank(payload.nama) && "Nama pelanggan wajib diisi.",
    !isValidEmail(payload.email) && "Email pelanggan tidak valid.",
    !isValidPhone(payload.no_hp) && "Nomor HP pelanggan tidak valid.",
    isBlank(payload.alamat) && "Alamat pelanggan wajib diisi.",
    isBlank(payload.id_paket) && "Paket pelanggan wajib dipilih.",
  ]);
}

function validateTeknisi(payload = {}) {
  return collectErrors([
    isBlank(payload.nama) && "Nama teknisi wajib diisi.",
    !isValidPhone(payload.no_hp) && "Nomor HP teknisi tidak valid.",
    !["AKTIF", "CUTI", "NONAKTIF"].includes(String(payload.status || "")) &&
      "Status teknisi tidak valid.",
  ]);
}

function validateKeluhan(payload = {}) {
  return collectErrors([
    isBlank(payload.deskripsi) && "Deskripsi keluhan wajib diisi.",
    !isValidDateInput(payload.tanggal) && "Tanggal keluhan tidak valid.",
  ]);
}

function validateAssignTeknisi(payload = {}) {
  return collectErrors([
    isBlank(payload.id_keluhan) && "Keluhan yang akan di-assign wajib dipilih.",
    isBlank(payload.id_teknisi) && "Teknisi wajib dipilih.",
  ]);
}

function validateTaskStatusUpdate(payload = {}, allowedStatuses = []) {
  return collectErrors([
    !allowedStatuses.includes(String(payload.status || "")) &&
      "Status tugas tidak valid.",
  ]);
}

function validateTagihan(payload = {}) {
  return collectErrors([
    isBlank(payload.id_pelanggan) && "Pelanggan wajib dipilih.",
    isBlank(payload.id_paket) && "Paket wajib dipilih.",
    !isValidDateInput(payload.tanggal_tagihan) && "Tanggal tagihan tidak valid.",
    !isPositiveNumber(payload.jumlah_tagihan) && "Jumlah tagihan harus lebih dari 0.",
    !["belum_bayar", "lunas"].includes(String(payload.status_tagihan || "")) &&
      "Status tagihan tidak valid.",
  ]);
}

function validatePaymentPreparation(payload = {}) {
  return collectErrors([
    !["qris", "va", "cash"].includes(String(payload.metode || "").toLowerCase()) &&
      "Metode pembayaran tidak valid.",
  ]);
}

function validateCashPayment(payload = {}) {
  return collectErrors([
    isBlank(payload.id_tagihan) && "Tagihan wajib dipilih.",
    !isValidDateInput(payload.tanggal_bayar) && "Tanggal bayar tidak valid.",
    !isPositiveNumber(payload.jumlah_bayar) && "Jumlah bayar harus lebih dari 0.",
  ]);
}

module.exports = {
  validateLogin,
  validatePelanggan,
  validateTeknisi,
  validateKeluhan,
  validateAssignTeknisi,
  validateTaskStatusUpdate,
  validateTagihan,
  validatePaymentPreparation,
  validateCashPayment,
};
