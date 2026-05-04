CREATE DATABASE IF NOT EXISTS myringnet;
USE myringnet;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS hasil_pekerjaan;
DROP TABLE IF EXISTS tugas_teknisi;
DROP TABLE IF EXISTS pembayaran;
DROP TABLE IF EXISTS tagihan;
DROP TABLE IF EXISTS keluhan;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS manajemen;
DROP TABLE IF EXISTS teknisi;
DROP TABLE IF EXISTS pelanggan;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS notifikasi;
DROP TABLE IF EXISTS odp;
DROP TABLE IF EXISTS odc;
DROP TABLE IF EXISTS paket;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE paket (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_paket VARCHAR(100) NOT NULL,
  kecepatan VARCHAR(50) NOT NULL,
  harga DECIMAL(12,2) NOT NULL,
  deskripsi TEXT,
  UNIQUE KEY uk_paket_nama (nama_paket)
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','teknisi','pelanggan','manajemen') NOT NULL
);

CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE manajemen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  CONSTRAINT fk_manajemen_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE teknisi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  no_hp VARCHAR(25) NOT NULL UNIQUE,
  status ENUM('AKTIF','CUTI','NONAKTIF') NOT NULL DEFAULT 'AKTIF',
  CONSTRAINT fk_teknisi_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE pelanggan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NULL,
  alamat TEXT NOT NULL,
  no_hp VARCHAR(25) NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  id_paket INT NOT NULL,
  tanggal_daftar DATE NOT NULL,
  CONSTRAINT fk_pelanggan_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pelanggan_paket FOREIGN KEY (id_paket) REFERENCES paket(id)
    ON UPDATE CASCADE
);

CREATE TABLE odc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_odc VARCHAR(100) NOT NULL UNIQUE,
  lokasi TEXT NOT NULL,
  kapasitas INT NOT NULL DEFAULT 0
);

CREATE TABLE odp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_odc INT NULL,
  nama_odp VARCHAR(100) NOT NULL UNIQUE,
  lokasi TEXT NOT NULL,
  kapasitas INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_odp_odc FOREIGN KEY (id_odc) REFERENCES odc(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE tagihan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_pelanggan INT NOT NULL,
  id_paket INT NOT NULL,
  tanggal_tagihan DATE NOT NULL,
  jumlah_tagihan DECIMAL(12,2) NOT NULL,
  status_tagihan ENUM('belum_bayar','lunas') NOT NULL DEFAULT 'belum_bayar',
  CONSTRAINT fk_tagihan_pelanggan FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tagihan_paket FOREIGN KEY (id_paket) REFERENCES paket(id)
    ON UPDATE CASCADE
);

CREATE TABLE pembayaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_tagihan INT NOT NULL,
  metode ENUM('qris','va','cash') NOT NULL,
  va_number VARCHAR(50) NULL,
  payment_reference VARCHAR(100) NULL UNIQUE,
  jumlah_bayar DECIMAL(12,2) NOT NULL,
  tanggal_bayar DATE NOT NULL,
  status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  status_pembayaran ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_pembayaran_tagihan FOREIGN KEY (id_tagihan) REFERENCES tagihan(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE keluhan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_pelanggan INT NOT NULL,
  deskripsi TEXT NOT NULL,
  tanggal DATE NOT NULL,
  status ENUM('pending','proses','selesai') NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_keluhan_pelanggan FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE tugas_teknisi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_keluhan INT NULL,
  id_pelanggan INT NULL,
  id_teknisi INT NOT NULL,
  detail_lokasi TEXT NOT NULL,
  tipe_tugas ENUM('maintenance','psb') NOT NULL DEFAULT 'maintenance',
  tanggal_tugas DATE NULL,
  status ENUM('pending','proses','selesai') NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_tugas_keluhan FOREIGN KEY (id_keluhan) REFERENCES keluhan(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tugas_pelanggan FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tugas_teknisi FOREIGN KEY (id_teknisi) REFERENCES teknisi(id)
    ON UPDATE CASCADE
);

CREATE TABLE hasil_pekerjaan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_tugas INT NOT NULL,
  foto_bukti VARCHAR(255),
  deskripsi TEXT NOT NULL,
  CONSTRAINT fk_hasil_tugas FOREIGN KEY (id_tugas) REFERENCES tugas_teknisi(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE notifikasi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pesan TEXT NOT NULL,
  role_tujuan ENUM('admin','teknisi','pelanggan','semua') NOT NULL DEFAULT 'admin',
  tipe ENUM('general','psb','maintenance') NOT NULL DEFAULT 'general',
  alamat TEXT NULL,
  tanggal_saran DATE NULL,
  id_teknisi INT NULL,
  id_pelanggan INT NULL,
  id_tugas INT NULL,
  tanggal DATETIME NOT NULL,
  status_baca ENUM('unread','read','scheduled') NOT NULL DEFAULT 'unread',
  status_notifikasi ENUM('pending','scheduled','done') NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_notifikasi_teknisi FOREIGN KEY (id_teknisi) REFERENCES teknisi(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_notifikasi_pelanggan FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_notifikasi_tugas FOREIGN KEY (id_tugas) REFERENCES tugas_teknisi(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  aksi VARCHAR(50) NOT NULL,
  tabel VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_tagihan_pelanggan_status_tanggal ON tagihan (id_pelanggan, status_tagihan, tanggal_tagihan);
CREATE INDEX idx_pembayaran_status_metode ON pembayaran (status_pembayaran, metode);
CREATE INDEX idx_keluhan_status_tanggal ON keluhan (status, tanggal);
CREATE INDEX idx_tugas_teknisi_tanggal_status ON tugas_teknisi (id_teknisi, tanggal_tugas, status);
CREATE INDEX idx_audit_created_at ON audit_log (created_at);

INSERT INTO paket (nama_paket, kecepatan, harga, deskripsi) VALUES
  ('Basic 20 Mbps', '20 Mbps', 250000, 'Paket rumahan hemat'),
  ('Family 50 Mbps', '50 Mbps', 400000, 'Paket keluarga stabil'),
  ('Bisnis 100 Mbps', '100 Mbps', 750000, 'Paket kantor dan UMKM');

INSERT INTO users (id, username, password, role) VALUES
  (1, 'admin', '$2b$10$lWFzdy8z02V7i4Oetc4UTu3MR4IHvsaKeCkdJtEPvWfxLU/wV5VHe', 'admin'),
  (2, 'pelanggan1', '$2b$10$VvdcCnyKUuWln.Gty.HqWeJ.xUexbTwV1m6I0rBG.uyi9MFba.s.K', 'pelanggan'),
  (3, 'teknisi1', '$2b$10$eefpaPAH8NVc9kIFQVR4HeRqJ93jP5SDgHcDC5r/u7VDBXhx1KSJm', 'teknisi'),
  (4, 'manajemen1', '$2b$10$VoHh5avPq416Qf2PWv5SB.eCl1SrvMj9eaGsOB893P8TR8rvTRS/C', 'manajemen');

INSERT INTO admin (user_id, nama, email) VALUES
  (1, 'Administrator', 'admin@myringnet.id');

INSERT INTO manajemen (user_id, nama, email) VALUES
  (4, 'Manajemen MyRingNet', 'manajemen@myringnet.id');

INSERT INTO pelanggan (user_id, nama, email, alamat, no_hp, latitude, longitude, id_paket, tanggal_daftar) VALUES
  (2, 'Budi Santoso', 'budi@example.com', 'Jl. Kenanga No. 10', '081234567890', NULL, NULL, 1, '2026-01-10');

INSERT INTO teknisi (user_id, nama, no_hp, status) VALUES
  (3, 'Andi Teknisi', '081300000001', 'AKTIF');

INSERT INTO odc (nama_odc, lokasi, kapasitas) VALUES
  ('ODC Kenanga', 'Area Kenanga', 144);

INSERT INTO odp (id_odc, nama_odp, lokasi, kapasitas) VALUES
  (1, 'ODP Kenanga 01', 'Jl. Kenanga No. 1-20', 16);
