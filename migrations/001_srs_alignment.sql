USE myringnet;

ALTER TABLE users
  MODIFY role ENUM('admin','teknisi','pelanggan','manajemen') NOT NULL;

CREATE TABLE IF NOT EXISTS manajemen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  CONSTRAINT fk_manajemen_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE pelanggan
  ADD COLUMN email VARCHAR(100) NULL AFTER nama,
  ADD COLUMN latitude DECIMAL(10,7) NULL AFTER no_hp,
  ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude;

CREATE TABLE IF NOT EXISTS odc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_odc VARCHAR(100) NOT NULL UNIQUE,
  lokasi TEXT NOT NULL,
  kapasitas INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS odp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_odc INT NULL,
  nama_odp VARCHAR(100) NOT NULL UNIQUE,
  lokasi TEXT NOT NULL,
  kapasitas INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_odp_odc FOREIGN KEY (id_odc) REFERENCES odc(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE pembayaran
  MODIFY status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_reference VARCHAR(100) NULL AFTER va_number,
  ADD COLUMN status_pembayaran ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending' AFTER status;

UPDATE pembayaran SET status_pembayaran = status WHERE status_pembayaran = 'pending';

CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  aksi VARCHAR(50) NOT NULL,
  tabel VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO users (username, password, role)
SELECT 'manajemen1', 'manajemen123', 'manajemen'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'manajemen1');

INSERT INTO manajemen (user_id, nama, email)
SELECT users.id, 'Manajemen MyRingNet', 'manajemen@myringnet.id'
FROM users
WHERE users.username = 'manajemen1'
  AND NOT EXISTS (SELECT 1 FROM manajemen WHERE user_id = users.id);

INSERT INTO odc (nama_odc, lokasi, kapasitas)
SELECT 'ODC Kenanga', 'Area Kenanga', 144
WHERE NOT EXISTS (SELECT 1 FROM odc WHERE nama_odc = 'ODC Kenanga');

INSERT INTO odp (id_odc, nama_odp, lokasi, kapasitas)
SELECT odc.id, 'ODP Kenanga 01', 'Jl. Kenanga No. 1-20', 16
FROM odc
WHERE odc.nama_odc = 'ODC Kenanga'
  AND NOT EXISTS (SELECT 1 FROM odp WHERE nama_odp = 'ODP Kenanga 01');
