require("./config/loadEnv");

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const csrf = require("csurf");
const session = require("express-session");
const methodOverride = require("method-override");
const https = require("https");

const pool = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const pelangganRoutes = require("./routes/pelangganRoutes");
const paketRoutes = require("./routes/paketRoutes");
const tagihanRoutes = require("./routes/tagihanRoutes");
const pembayaranRoutes = require("./routes/pembayaranRoutes");
const keluhanRoutes = require("./routes/keluhanRoutes");
const teknisiRoutes = require("./routes/teknisiRoutes");
const notifikasiRoutes = require("./routes/notifikasiRoutes");
const manajemenRoutes = require("./routes/manajemenRoutes");
const laporanRoutes = require("./routes/laporanRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const auditRoutes = require("./routes/auditRoutes");
const { attachGlobals } = require("./middlewares/viewMiddleware");
const { attachFlash } = require("./middlewares/flashMiddleware");
const auditService = require("./services/auditService");
const { startBillingJob } = require("./jobs/billingJob");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = requireSessionSecret();
const SECURE_SESSION_COOKIE =
  process.env.SESSION_SECURE === "true" ||
  process.env.NODE_ENV === "production" ||
  process.env.HTTPS_DEV === "true";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const csrfProtection = csrf();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  cors({
    origin: CORS_ORIGIN,
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: SESSION_SECRET,
    name: "silji.sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: SECURE_SESSION_COOKIE,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/vendor/chart.js", express.static(path.join(__dirname, "node_modules", "chart.js", "dist")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(attachFlash);
app.use((req, res, next) => {
  if (req.path === "/payment/callback") {
    next();
    return;
  }

  csrfProtection(req, res, next);
});
app.use((req, res, next) => {
  res.locals.csrfToken = typeof req.csrfToken === "function" ? req.csrfToken() : "";
  next();
});
app.use(attachGlobals);
app.use((req, res, next) => {
  const shouldAudit = ["POST", "PUT", "DELETE"].includes(req.method) && req.path !== "/login";
  if (shouldAudit) {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        auditService.log(
          req,
          req.method.toLowerCase(),
          req.path.split("/").filter(Boolean)[0] || "system",
          `${req.method} ${req.originalUrl}`
        );
      }
    });
  }
  next();
});

app.use(authRoutes);
app.use(dashboardRoutes);
app.use("/pelanggan", pelangganRoutes);
app.use("/paket", paketRoutes);
app.use("/tagihan", tagihanRoutes);
app.use("/pembayaran", pembayaranRoutes);
app.use("/keluhan", keluhanRoutes);
app.use("/teknisi", teknisiRoutes);
app.use("/notifikasi", notifikasiRoutes);
app.use("/manajemen", manajemenRoutes);
app.use("/laporan", laporanRoutes);
app.use("/payment", paymentRoutes);
app.use("/audit", auditRoutes);

app.use((req, res) => {
  res.status(404).render("shared/error", {
    title: "404",
    message: "Halaman tidak ditemukan.",
  });
});

app.use((error, req, res, _next) => {
  console.error(error);
  if (error.code === "EBADCSRFTOKEN") {
    req.flash("error", "Sesi form tidak valid. Silakan ulangi dari halaman aplikasi.");
    res.status(403).redirect(req.get("referer") || "/dashboard");
    return;
  }

  res.status(500).render("shared/error", {
    title: "Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Terjadi kesalahan pada server."
        : error.message || "Terjadi kesalahan pada server.",
  });
});

function requireSessionSecret() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET wajib diset di .env sebelum aplikasi dijalankan.");
  }

  return process.env.SESSION_SECRET;
}

async function start() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log("MySQL connected.");
  } catch (error) {
    console.warn("MySQL belum terhubung:", error.message);
  }

  startBillingJob();
  if (process.env.HTTPS_DEV === "true" && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    const key = fs.readFileSync(process.env.SSL_KEY_PATH);
    const cert = fs.readFileSync(process.env.SSL_CERT_PATH);
    https.createServer({ key, cert }, app).listen(PORT, () => {
      console.log(`SILJI berjalan di https://localhost:${PORT}`);
    });
    return;
  }

  app.listen(PORT, () => {
    console.log(`SILJI berjalan di http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
