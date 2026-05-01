CREATE DATABASE IF NOT EXISTS myringnet;
USE myringnet;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS hasil_pekerjaan;
DROP TABLE IF EXISTS tugas_teknisi;
DROP TABLE IF EXISTS pembayaran;
DROP TABLE IF EXISTS tagihan;
DROP TABLE IF EXISTS keluhan;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS teknisi;
DROP TABLE IF EXISTS pelanggan;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS notifikasi;
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
  role ENUM('admin','teknisi','pelanggan') NOT NULL
);

CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id)
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
  alamat TEXT NOT NULL,
  no_hp VARCHAR(25) NOT NULL,
  id_paket INT NOT NULL,
  tanggal_daftar DATE NOT NULL,
  CONSTRAINT fk_pelanggan_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pelanggan_paket FOREIGN KEY (id_paket) REFERENCES paket(id)
    ON UPDATE CASCADE
);

CREATE TABLE tagihan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_pelanggan INT NOT NULL,
  id_paket INT NOT NULL,
  tanggal_tagihan DATE NOT NULL,
  jumlah_tagihan DECIMAL(12,2) NOT NULL,
  status_tagihan ENUM('BELUM BAYAR','LUNAS') NOT NULL DEFAULT 'BELUM BAYAR',
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
  jumlah_bayar DECIMAL(12,2) NOT NULL,
  tanggal_bayar DATE NOT NULL,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_pembayaran_tagihan FOREIGN KEY (id_tagihan) REFERENCES tagihan(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE keluhan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_pelanggan INT NOT NULL,
  deskripsi TEXT NOT NULL,
  tanggal DATE NOT NULL,
  status ENUM('BARU','DIPROSES','SELESAI') NOT NULL DEFAULT 'BARU',
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
  status ENUM('DITUGASKAN','PROSES','SELESAI') NOT NULL DEFAULT 'DITUGASKAN',
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
  status_baca ENUM('BELUM','SUDAH') NOT NULL DEFAULT 'BELUM',
  CONSTRAINT fk_notifikasi_teknisi FOREIGN KEY (id_teknisi) REFERENCES teknisi(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_notifikasi_pelanggan FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_notifikasi_tugas FOREIGN KEY (id_tugas) REFERENCES tugas_teknisi(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO paket (nama_paket, kecepatan, harga, deskripsi) VALUES
  ('Basic 20 Mbps', '20 Mbps', 250000, 'Paket rumahan hemat'),
  ('Family 50 Mbps', '50 Mbps', 400000, 'Paket keluarga stabil'),
  ('Bisnis 100 Mbps', '100 Mbps', 750000, 'Paket kantor dan UMKM');

INSERT INTO users (id, username, password, role) VALUES
  (1, 'admin', 'admin123', 'admin'),
  (2, 'pelanggan1', 'pelanggan123', 'pelanggan'),
  (3, 'teknisi1', 'teknisi123', 'teknisi');

INSERT INTO admin (user_id, nama, email) VALUES
  (1, 'Administrator', 'admin@myringnet.id');

INSERT INTO pelanggan (user_id, nama, alamat, no_hp, id_paket, tanggal_daftar) VALUES
  (2, 'Budi Santoso', 'Jl. Kenanga No. 10', '081234567890', 1, '2026-01-10');

INSERT INTO teknisi (user_id, nama, no_hp, status) VALUES
  (3, 'Andi Teknisi', '081300000001', 'AKTIF');
