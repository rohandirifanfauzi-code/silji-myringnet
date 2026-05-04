# SILJI MyRingNet

Sistem Informasi Layanan Internet berbasis Node.js, Express, EJS, MySQL, Bootstrap, dan arsitektur MVC.

## Fitur Utama

- Dashboard role `admin`, `pelanggan`, `teknisi`, dan `manajemen`.
- Flow keluhan terhubung ke tugas teknisi.
- Tagihan dibuat otomatis oleh sistem billing, bukan input manual.
- Pembayaran pelanggan dengan QRIS, VA, dan cash.
- Laporan admin/manajemen dengan export PDF dan Excel.
- Notifikasi teknisi dengan lifecycle `pending`, `scheduled`, `done`.
- Proteksi dasar: bcrypt password, session secret wajib, CSRF, upload image-only, dan CORS terbatas.

## Setup

1. Install dependency:

   ```powershell
   npm install
   ```

2. Import database awal:

   ```powershell
   mysql -u root -p < database.sql
   ```

   Jika memakai PowerShell dan redirect `<` tidak bisa dipakai, jalankan:

   ```powershell
   Get-Content .\database.sql | mysql -u root -p
   ```

3. Buat `.env` di root project:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=isi_password_mysql_anda
   DB_NAME=myringnet
   PORT=3000
   SESSION_SECRET=ganti_dengan_secret_panjang_dan_acak
   SESSION_SECURE=false
   CORS_ORIGIN=http://localhost:3000
   ```

   Untuk production atau HTTPS lokal, set `SESSION_SECURE=true`.

4. Jalankan aplikasi:

   ```powershell
   npm start
   ```

5. Buka:

   ```text
   http://localhost:3000
   ```

## Migration

Untuk database yang sudah ada, jalankan migration berurutan sesuai kebutuhan:

```powershell
Get-Content .\migrations\001_srs_alignment.sql | mysql -u root -p myringnet
Get-Content .\migrations\002_status_consistency.sql | mysql -u root -p myringnet
Get-Content .\migrations\003_notification_lifecycle.sql | mysql -u root -p myringnet
Get-Content .\migrations\004_bcrypt_default_passwords.sql | mysql -u root -p myringnet
```

## Akun Demo

- `admin / admin123`
- `pelanggan1 / pelanggan123`
- `teknisi1 / teknisi123`
- `manajemen1 / manajemen123`

Password seed di database disimpan sebagai bcrypt hash.

## Test

Jalankan seluruh test:

```powershell
npm test
```

Coverage test saat ini mencakup login admin, assign keluhan, tugas teknisi, pembayaran pelanggan, billing, validasi form, password security, dan validasi upload.
