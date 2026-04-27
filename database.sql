CREATE DATABASE IF NOT EXISTS myringnet;
USE myringnet;

CREATE TABLE IF NOT EXISTS paket (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_paket VARCHAR(100) NOT NULL,
  kecepatan VARCHAR(50) NOT NULL,
  harga DECIMAL(12,2) NOT NULL,
  deskripsi TEXT,
  UNIQUE KEY uk_paket_nama (nama_paket)
);

CREATE TABLE IF NOT EXISTS pelanggan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  no_hp VARCHAR(25) NOT NULL,
  alamat TEXT NOT NULL,
  id_paket INT NOT NULL,
  tanggal_daftar DATE NOT NULL,
  CONSTRAINT fk_pelanggan_paket FOREIGN KEY (id_paket) REFERENCES paket(id)
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS teknisi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  no_hp VARCHAR(25) NOT NULL,
  status ENUM('AKTIF','CUTI','NONAKTIF') NOT NULL DEFAULT 'AKTIF',
  UNIQUE KEY uk_teknisi_no_hp (no_hp)
);

CREATE TABLE IF NOT EXISTS tagihan (
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

CREATE TABLE IF NOT EXISTS pembayaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_tagihan INT NOT NULL,
  metode_pembayaran VARCHAR(100) NOT NULL,
  jumlah_bayar DECIMAL(12,2) NOT NULL,
  tanggal_bayar DATE NOT NULL,
  CONSTRAINT fk_pembayaran_tagihan FOREIGN KEY (id_tagihan) REFERENCES tagihan(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS keluhan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_pelanggan INT NOT NULL,
  deskripsi TEXT NOT NULL,
  tanggal DATE NOT NULL,
  status ENUM('BARU','DIPROSES','SELESAI') NOT NULL DEFAULT 'BARU',
  CONSTRAINT fk_keluhan_pelanggan FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tugas_teknisi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_keluhan INT NOT NULL,
  id_teknisi INT NOT NULL,
  detail_lokasi TEXT NOT NULL,
  status ENUM('DITUGASKAN','PROSES','SELESAI') NOT NULL DEFAULT 'DITUGASKAN',
  CONSTRAINT fk_tugas_keluhan FOREIGN KEY (id_keluhan) REFERENCES keluhan(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tugas_teknisi FOREIGN KEY (id_teknisi) REFERENCES teknisi(id)
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS hasil_pekerjaan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_tugas INT NOT NULL,
  foto_bukti VARCHAR(255),
  deskripsi TEXT NOT NULL,
  CONSTRAINT fk_hasil_tugas FOREIGN KEY (id_tugas) REFERENCES tugas_teknisi(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS notifikasi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pesan TEXT NOT NULL,
  tanggal DATETIME NOT NULL,
  status_baca ENUM('BELUM','SUDAH') NOT NULL DEFAULT 'BELUM'
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  role ENUM('admin','pelanggan','teknisi','manajemen') NOT NULL,
  nama VARCHAR(100),
  pelanggan_id INT NULL,
  teknisi_id INT NULL,
  CONSTRAINT fk_users_pelanggan FOREIGN KEY (pelanggan_id) REFERENCES pelanggan(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_users_teknisi FOREIGN KEY (teknisi_id) REFERENCES teknisi(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','pelanggan','teknisi','manajemen') NOT NULL;

INSERT INTO paket (nama_paket, kecepatan, harga, deskripsi) VALUES
  ('Basic 20 Mbps', '20 Mbps', 250000, 'Paket rumahan hemat'),
  ('Family 50 Mbps', '50 Mbps', 400000, 'Paket keluarga stabil'),
  ('Bisnis 100 Mbps', '100 Mbps', 750000, 'Paket kantor dan UMKM')
ON DUPLICATE KEY UPDATE nama_paket = VALUES(nama_paket);

INSERT INTO pelanggan (nama, email, no_hp, alamat, id_paket, tanggal_daftar) VALUES
  ('Budi Santoso', 'budi@myringnet.id', '081234567890', 'Jl. Kenanga No. 10', 1, '2026-01-10'),
  ('Sari Wulandari', 'sari@myringnet.id', '081298765432', 'Jl. Merpati No. 5', 2, '2026-02-15')
ON DUPLICATE KEY UPDATE nama = VALUES(nama);

INSERT INTO teknisi (nama, no_hp, status) VALUES
  ('Andi Teknisi', '081300000001', 'AKTIF'),
  ('Rizal Teknisi', '081300000002', 'AKTIF')
ON DUPLICATE KEY UPDATE nama = VALUES(nama), status = VALUES(status);

INSERT INTO users (username, password, role, nama, pelanggan_id, teknisi_id) VALUES
  ('admin', 'admin123', 'admin', 'Administrator', NULL, NULL),
  ('pelanggan1', 'pelanggan123', 'pelanggan', NULL, 1, NULL),
  ('teknisi1', 'teknisi123', 'teknisi', NULL, NULL, 1),
  ('manajemen1', 'manajemen123', 'manajemen', 'Manajemen MyRingNet', NULL, NULL)
ON DUPLICATE KEY UPDATE username = VALUES(username);
