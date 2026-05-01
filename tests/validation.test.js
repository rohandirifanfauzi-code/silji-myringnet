const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateLogin,
  validatePelanggan,
  validateTeknisi,
  validatePaymentPreparation,
  validateCashPayment,
} = require("../services/validationService");

test("validateLogin requires username and password", () => {
  const errors = validateLogin({});
  assert.deepEqual(errors, ["Username wajib diisi.", "Password wajib diisi."]);
});

test("validatePelanggan accepts valid payload", () => {
  const errors = validatePelanggan({
    nama: "Budi",
    no_hp: "081234567890",
    alamat: "Jl. Kenanga No. 10",
    id_paket: 1,
  });
  assert.equal(errors.length, 0);
});

test("validateTeknisi rejects invalid phone and status", () => {
  const errors = validateTeknisi({
    nama: "Teknisi A",
    no_hp: "12345",
    status: "SIAGA",
  });
  assert.deepEqual(errors, [
    "Nomor HP teknisi tidak valid.",
    "Status teknisi tidak valid.",
  ]);
});

test("validatePaymentPreparation rejects unknown method", () => {
  const errors = validatePaymentPreparation({
    id_tagihan: 10,
    metode: "transfer-bank",
  });
  assert.deepEqual(errors, ["Metode pembayaran tidak valid."]);
});

test("validateCashPayment requires positive amount and valid date", () => {
  const errors = validateCashPayment({
    id_tagihan: 10,
    jumlah_bayar: 0,
    tanggal_bayar: "",
  });
  assert.deepEqual(errors, [
    "Tanggal bayar tidak valid.",
    "Jumlah bayar harus lebih dari 0.",
  ]);
});
