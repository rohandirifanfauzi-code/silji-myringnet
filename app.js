require("./config/loadEnv");

const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");

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
const { attachGlobals } = require("./middlewares/viewMiddleware");
const { startBillingJob } = require("./jobs/billingJob");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "silji-secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());
app.use(attachGlobals);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(authRoutes);
app.use(dashboardRoutes);
app.use("/pelanggan", pelangganRoutes);
app.use("/paket", paketRoutes);
app.use("/tagihan", tagihanRoutes);
app.use("/pembayaran", pembayaranRoutes);
app.use("/keluhan", keluhanRoutes);
app.use("/teknisi", teknisiRoutes);
app.use("/notifikasi", notifikasiRoutes);

app.use((req, res) => {
  res.status(404).render("shared/error", {
    title: "404",
    message: "Halaman tidak ditemukan.",
  });
});

app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).render("shared/error", {
    title: "Error",
    message: error.message || "Terjadi kesalahan pada server.",
  });
});

async function start() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log("MySQL connected.");
  } catch (error) {
    console.warn("MySQL belum terhubung:", error.message);
  }

  startBillingJob();
  app.listen(PORT, () => {
    console.log(`SILJI berjalan di http://localhost:${PORT}`);
  });
}

start();
