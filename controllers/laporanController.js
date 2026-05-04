const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");
const analyticsModel = require("../models/analyticsModel");

const REPORT_TYPES = ["pelanggan", "tagihan", "pembayaran", "keluhan"];

function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("id-ID");
}

function normalizeReportType(type) {
  return REPORT_TYPES.includes(type) ? type : null;
}

async function index(req, res, next) {
  try {
    const reports = await analyticsModel.getReports();
    res.render("laporan/index", {
      title: "Laporan Perusahaan",
      reports,
      reportTypes: REPORT_TYPES,
      printedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
}

async function exportPdf(req, res, next) {
  try {
    const type = normalizeReportType(req.params.jenis || req.params.type);
    if (!type) {
      res.status(404).render("shared/error", {
        title: "Laporan tidak ditemukan",
        message: "Jenis laporan tidak tersedia.",
      });
      return;
    }

    const report = await analyticsModel.getReportByType(type);
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const printedAt = new Date();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan-${type}-silji-myringnet.pdf`
    );
    doc.pipe(res);

    drawPdfHeader(doc, report, printedAt);
    drawPdfSummary(doc, report);
    drawPdfDetailTable(doc, report);
    drawPdfFooter(doc, report, printedAt);

    doc.end();
  } catch (error) {
    next(error);
  }
}

async function exportExcel(req, res, next) {
  try {
    const type = normalizeReportType(req.params.jenis || req.params.type);
    if (!type) {
      res.status(404).render("shared/error", {
        title: "Laporan tidak ditemukan",
        message: "Jenis laporan tidak tersedia.",
      });
      return;
    }

    const report = await analyticsModel.getReportByType(type);
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(buildSummaryRows(report));
    const detailSheet = XLSX.utils.json_to_sheet(buildExcelDetailRows(report));

    summarySheet["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 46 }];
    detailSheet["!cols"] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 42 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");
    XLSX.utils.book_append_sheet(workbook, detailSheet, sheetName(report.title));

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan-${type}-silji-myringnet.xlsx`
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

function drawPdfHeader(doc, report, printedAt) {
  doc
    .fillColor("#0f172a")
    .fontSize(18)
    .text("SILJI MyRingNet", { align: "left" });
  doc
    .fontSize(10)
    .fillColor("#64748b")
    .text("Sistem Informasi Layanan Internet", { align: "left" });
  doc.moveDown(0.8);
  doc
    .fontSize(16)
    .fillColor("#0f172a")
    .text(report.title, { align: "left" });
  doc
    .fontSize(10)
    .fillColor("#475569")
    .text(`Tanggal cetak: ${printedAt.toLocaleString("id-ID")}`);
  doc
    .moveTo(48, doc.y + 14)
    .lineTo(547, doc.y + 14)
    .strokeColor("#cbd5e1")
    .lineWidth(1)
    .stroke();
  doc.moveDown(1.6);
}

function drawPdfSummary(doc, report) {
  doc.fontSize(12).fillColor("#0f172a").text("Ringkasan", { underline: true });
  doc.moveDown(0.4);
  buildSummaryRows(report).forEach((row) => {
    doc
      .fontSize(10)
      .fillColor("#334155")
      .text(`${row.Metrik}: ${row.Nilai}`);
  });
  doc.moveDown();
}

function drawPdfDetailTable(doc, report) {
  const rows = buildExcelDetailRows(report).slice(0, 35);
  const columns = [
    { key: "Nama", label: "Nama", width: 132 },
    { key: "Tanggal", label: "Tanggal", width: 75 },
    { key: "Jumlah", label: "Jumlah", width: 100 },
    { key: "Status", label: "Status", width: 80 },
    { key: "Keterangan", label: "Keterangan", width: 112 },
  ];
  let y = doc.y;

  doc.fontSize(12).fillColor("#0f172a").text("Tabel Data", { underline: true });
  y = doc.y + 12;
  drawTableHeader(doc, columns, y);
  y += 24;

  rows.forEach((row) => {
    if (y > 720) {
      doc.addPage();
      y = 48;
      drawTableHeader(doc, columns, y);
      y += 24;
    }

    let x = 48;
    columns.forEach((column) => {
      doc
        .fontSize(8.5)
        .fillColor("#334155")
        .text(String(row[column.key] || "-"), x, y + 6, {
          width: column.width - 8,
          height: 28,
          ellipsis: true,
        });
      x += column.width;
    });
    doc
      .moveTo(48, y + 30)
      .lineTo(547, y + 30)
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .stroke();
    y += 32;
  });

  doc.y = y + 8;
}

function drawTableHeader(doc, columns, y) {
  doc.rect(48, y, 499, 22).fill("#f1f5f9");
  let x = 48;
  columns.forEach((column) => {
    doc
      .fontSize(8.5)
      .fillColor("#0f172a")
      .text(column.label, x + 4, y + 7, {
        width: column.width - 8,
        height: 12,
      });
    x += column.width;
  });
}

function drawPdfFooter(doc, report, printedAt) {
  const details = report.data.detail || [];
  if (doc.y > 720) {
    doc.addPage();
  }
  doc.moveDown();
  doc
    .fontSize(10)
    .fillColor("#0f172a")
    .text(`Total data ditampilkan: ${details.length}`);
  doc
    .fontSize(9)
    .fillColor("#64748b")
    .text(
      `Keterangan: ${report.description} Dokumen dicetak otomatis pada ${printedAt.toLocaleString("id-ID")}.`
    );
}

function buildSummaryRows(report) {
  const data = report.data;
  if (report.type === "pelanggan") {
    return [
      { Metrik: "Total Pelanggan", Nilai: data.total, Keterangan: "Seluruh pelanggan terdaftar" },
      { Metrik: "Pelanggan Aktif", Nilai: data.aktif, Keterangan: "Pelanggan aktif operasional" },
      { Metrik: "Pelanggan Baru Bulan Ini", Nilai: data.baruBulanIni, Keterangan: "Berdasarkan tanggal daftar" },
    ];
  }

  if (report.type === "tagihan") {
    return [
      { Metrik: "Total Tagihan", Nilai: data.total, Keterangan: "Semua tagihan" },
      { Metrik: "Tagihan Belum Bayar", Nilai: data.belumBayar, Keterangan: "Status belum_bayar" },
      { Metrik: "Tagihan Lunas", Nilai: data.lunas, Keterangan: "Status lunas" },
      { Metrik: "Nominal Tagihan", Nilai: formatCurrency(data.nominal), Keterangan: "Akumulasi nominal tagihan" },
    ];
  }

  if (report.type === "pembayaran") {
    return [
      { Metrik: "Total Pemasukan", Nilai: formatCurrency(data.totalPemasukan), Keterangan: "Pembayaran berstatus paid" },
      { Metrik: "Total Transaksi", Nilai: data.totalTransaksi, Keterangan: "Semua transaksi pembayaran" },
      ...data.metode.map((row) => ({
        Metrik: `Metode ${String(row.label).toUpperCase()}`,
        Nilai: `${row.total} transaksi`,
        Keterangan: formatCurrency(row.nominal),
      })),
    ];
  }

  return [
    { Metrik: "Jumlah Keluhan", Nilai: data.total, Keterangan: "Semua keluhan pelanggan" },
    ...data.status.map((row) => ({
      Metrik: `Status ${row.label}`,
      Nilai: row.total,
      Keterangan: "Distribusi status keluhan",
    })),
  ];
}

function buildExcelDetailRows(report) {
  return (report.data.detail || []).map((row) => ({
    Nama: row.nama || "-",
    Tanggal: formatDate(row.tanggal),
    Jumlah:
      row.jumlah === null || row.jumlah === undefined || row.jumlah === ""
        ? "-"
        : Number(row.jumlah),
    Status: row.status || "-",
    Metode: row.metode || "-",
    Keterangan: row.deskripsi || row.paket || report.description,
  }));
}

function sheetName(title) {
  return title.replace(/^Laporan\s+/i, "").slice(0, 31);
}

module.exports = { index, exportPdf, exportExcel };
