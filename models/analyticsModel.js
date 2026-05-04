const { pool } = require("./baseModel");

async function getManagementSummary() {
  const [pelanggan, tagihan, pembayaran, keluhan] = await Promise.all([
    pool.query("SELECT COUNT(*) AS total FROM pelanggan"),
    pool.query("SELECT COUNT(*) AS total FROM tagihan"),
    pool.query("SELECT COALESCE(SUM(jumlah_bayar), 0) AS total FROM pembayaran WHERE status_pembayaran = 'paid' OR status = 'paid'"),
    pool.query("SELECT COUNT(*) AS total FROM keluhan"),
  ]);

  return {
    totalPelanggan: pelanggan[0][0].total,
    totalTagihan: tagihan[0][0].total,
    totalPembayaran: Number(pembayaran[0][0].total || 0),
    totalKeluhan: keluhan[0][0].total,
  };
}

async function getMonthlyAnalytics() {
  const [incomeRows] = await pool.query(
    `SELECT DATE_FORMAT(tanggal_bayar, '%Y-%m') AS bulan, COALESCE(SUM(jumlah_bayar), 0) AS total
     FROM pembayaran
     WHERE status_pembayaran = 'paid' OR status = 'paid'
     GROUP BY DATE_FORMAT(tanggal_bayar, '%Y-%m')
     ORDER BY bulan ASC
     LIMIT 12`
  );
  const [customerRows] = await pool.query(
    `SELECT DATE_FORMAT(tanggal_daftar, '%Y-%m') AS bulan, COUNT(*) AS total
     FROM pelanggan
     GROUP BY DATE_FORMAT(tanggal_daftar, '%Y-%m')
     ORDER BY bulan ASC
     LIMIT 12`
  );
  const [complaintRows] = await pool.query(
    `SELECT DATE_FORMAT(tanggal, '%Y-%m') AS bulan, COUNT(*) AS total
     FROM keluhan
     GROUP BY DATE_FORMAT(tanggal, '%Y-%m')
     ORDER BY bulan ASC
     LIMIT 12`
  );

  const labels = Array.from(
    new Set([
      ...incomeRows.map((row) => row.bulan),
      ...customerRows.map((row) => row.bulan),
      ...complaintRows.map((row) => row.bulan),
    ])
  ).sort();

  const toSeries = (rows) =>
    labels.map((label) => Number(rows.find((row) => row.bulan === label)?.total || 0));

  return {
    labels,
    pemasukan: toSeries(incomeRows),
    pelangganBaru: toSeries(customerRows),
    keluhan: toSeries(complaintRows),
  };
}

async function getReports() {
  const [pelanggan, tagihan, pembayaran, keluhan] = await Promise.all([
    getReportByType("pelanggan"),
    getReportByType("tagihan"),
    getReportByType("pembayaran"),
    getReportByType("keluhan"),
  ]);

  return {
    pelanggan: pelanggan.data,
    tagihan: tagihan.data,
    pembayaran: pembayaran.data,
    keluhan: keluhan.data,
  };
}

async function getReportByType(type) {
  const builders = {
    pelanggan: buildCustomerReport,
    tagihan: buildBillingReport,
    pembayaran: buildPaymentReport,
    keluhan: buildComplaintReport,
  };

  if (!builders[type]) {
    return null;
  }

  return builders[type]();
}

async function buildCustomerReport() {
  const [summaryRows] = await pool.query(
    `SELECT COUNT(*) AS total,
            COUNT(*) AS aktif,
            SUM(tanggal_daftar >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')) AS baru_bulan_ini
     FROM pelanggan`
  );
  const [monthlyRows] = await pool.query(
    `SELECT DATE_FORMAT(tanggal_daftar, '%Y-%m') AS label, COUNT(*) AS total
     FROM pelanggan
     GROUP BY DATE_FORMAT(tanggal_daftar, '%Y-%m')
     ORDER BY label DESC
     LIMIT 12`
  );
  const [detailRows] = await pool.query(
    `SELECT pelanggan.nama,
            pelanggan.tanggal_daftar AS tanggal,
            paket.nama_paket AS paket,
            paket.harga AS jumlah,
            'AKTIF' AS status
     FROM pelanggan
     LEFT JOIN paket ON paket.id = pelanggan.id_paket
     ORDER BY pelanggan.tanggal_daftar DESC, pelanggan.id DESC
     LIMIT 100`
  );

  const summary = summaryRows[0] || {};
  return {
    type: "pelanggan",
    title: "Laporan Pelanggan",
    description: "Ringkasan pertumbuhan dan status pelanggan SILJI MyRingNet.",
    data: {
      total: Number(summary.total || 0),
      aktif: Number(summary.aktif || 0),
      baruBulanIni: Number(summary.baru_bulan_ini || 0),
      bulanan: monthlyRows,
      detail: detailRows,
    },
  };
}

async function buildBillingReport() {
  const [summaryRows] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status_tagihan = 'belum_bayar') AS belum_bayar,
            SUM(status_tagihan = 'lunas') AS lunas,
            COALESCE(SUM(jumlah_tagihan), 0) AS nominal
     FROM tagihan`
  );
  const [monthlyRows] = await pool.query(
    `SELECT DATE_FORMAT(tanggal_tagihan, '%Y-%m') AS label,
            COUNT(*) AS total,
            COALESCE(SUM(jumlah_tagihan), 0) AS nominal
     FROM tagihan
     GROUP BY DATE_FORMAT(tanggal_tagihan, '%Y-%m')
     ORDER BY label DESC
     LIMIT 12`
  );
  const [detailRows] = await pool.query(
    `SELECT pelanggan.nama,
            tagihan.tanggal_tagihan AS tanggal,
            tagihan.jumlah_tagihan AS jumlah,
            tagihan.status_tagihan AS status
     FROM tagihan
     LEFT JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan
     ORDER BY tagihan.tanggal_tagihan DESC, tagihan.id DESC
     LIMIT 100`
  );

  const summary = summaryRows[0] || {};
  return {
    type: "tagihan",
    title: "Laporan Tagihan",
    description: "Ringkasan tagihan, status pelunasan, dan nominal tagihan.",
    data: {
      total: Number(summary.total || 0),
      belumBayar: Number(summary.belum_bayar || 0),
      lunas: Number(summary.lunas || 0),
      nominal: Number(summary.nominal || 0),
      bulanan: monthlyRows,
      detail: detailRows,
    },
  };
}

async function buildPaymentReport() {
  const [summaryRows] = await pool.query(
    `SELECT COUNT(*) AS total_transaksi,
            COALESCE(SUM(CASE WHEN status_pembayaran = 'paid' OR status = 'paid' THEN jumlah_bayar ELSE 0 END), 0) AS total_pemasukan
     FROM pembayaran`
  );
  const [methodRows] = await pool.query(
    `SELECT metode AS label,
            COUNT(*) AS total,
            COALESCE(SUM(jumlah_bayar), 0) AS nominal
     FROM pembayaran
     GROUP BY metode
     ORDER BY FIELD(metode, 'cash', 'qris', 'va')`
  );
  const [monthlyRows] = await pool.query(
    `SELECT DATE_FORMAT(tanggal_bayar, '%Y-%m') AS label,
            COUNT(*) AS total,
            COALESCE(SUM(jumlah_bayar), 0) AS nominal
     FROM pembayaran
     WHERE status_pembayaran = 'paid' OR status = 'paid'
     GROUP BY DATE_FORMAT(tanggal_bayar, '%Y-%m')
     ORDER BY label DESC
     LIMIT 12`
  );
  const [detailRows] = await pool.query(
    `SELECT pelanggan.nama,
            pembayaran.tanggal_bayar AS tanggal,
            pembayaran.jumlah_bayar AS jumlah,
            pembayaran.metode,
            pembayaran.status_pembayaran AS status
     FROM pembayaran
     LEFT JOIN tagihan ON tagihan.id = pembayaran.id_tagihan
     LEFT JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan
     ORDER BY pembayaran.tanggal_bayar DESC, pembayaran.id DESC
     LIMIT 100`
  );

  const summary = summaryRows[0] || {};
  return {
    type: "pembayaran",
    title: "Laporan Pembayaran",
    description: "Ringkasan pemasukan, metode pembayaran, dan transaksi bulanan.",
    data: {
      totalTransaksi: Number(summary.total_transaksi || 0),
      totalPemasukan: Number(summary.total_pemasukan || 0),
      metode: ["cash", "qris", "va"].map((method) => {
        const row = methodRows.find((item) => item.label === method) || {};
        return {
          label: method,
          total: Number(row.total || 0),
          nominal: Number(row.nominal || 0),
        };
      }),
      bulanan: monthlyRows,
      detail: detailRows,
    },
  };
}

async function buildComplaintReport() {
  const [summaryRows] = await pool.query("SELECT COUNT(*) AS total FROM keluhan");
  const [statusRows] = await pool.query(
    "SELECT status AS label, COUNT(*) AS total FROM keluhan GROUP BY status ORDER BY FIELD(status, 'pending', 'proses', 'selesai')"
  );
  const [monthlyRows] = await pool.query(
    `SELECT DATE_FORMAT(tanggal, '%Y-%m') AS label, COUNT(*) AS total
     FROM keluhan
     GROUP BY DATE_FORMAT(tanggal, '%Y-%m')
     ORDER BY label DESC
     LIMIT 12`
  );
  const [detailRows] = await pool.query(
    `SELECT pelanggan.nama,
            keluhan.tanggal,
            NULL AS jumlah,
            keluhan.status,
            keluhan.deskripsi
     FROM keluhan
     LEFT JOIN pelanggan ON pelanggan.id = keluhan.id_pelanggan
     ORDER BY keluhan.tanggal DESC, keluhan.id DESC
     LIMIT 100`
  );

  const status = ["pending", "proses", "selesai"].map((item) => {
    const row = statusRows.find((statusRow) => statusRow.label === item) || {};
    return {
      label: item,
      total: Number(row.total || 0),
    };
  });

  return {
    type: "keluhan",
    title: "Laporan Keluhan",
    description: "Ringkasan keluhan pelanggan dan progres penanganan.",
    data: {
      total: Number(summaryRows[0]?.total || 0),
      status,
      bulanan: monthlyRows,
      detail: detailRows,
    },
  };
}

module.exports = {
  getManagementSummary,
  getMonthlyAnalytics,
  getReports,
  getReportByType,
};
