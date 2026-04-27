# SILJI for MyRingNet

Sistem Informasi Layanan Internet berbasis Node.js, Express.js, MySQL, Bootstrap, dan arsitektur MVC.

## Fitur

- Login sederhana untuk `admin`, `pelanggan`, dan `teknisi`
- Login berbasis role untuk `admin`, `pelanggan`, `teknisi`, dan `manajemen`
- CRUD pelanggan, paket, tagihan, pembayaran, keluhan, dan teknisi
- Pembuatan akun pelanggan otomatis saat admin menambah pelanggan baru
- Auto billing terjadwal mengikuti tanggal pemasangan pertama pelanggan
- Notifikasi database untuk tagihan, pembayaran, dan update keluhan
- Assign teknisi dan upload hasil pekerjaan
- Pagination, search, filter status, dan upload gambar bukti
- Skema menambahkan tabel `users` dan kolom `pelanggan.id_paket` agar login role-based dan billing bulanan dapat berjalan

## Cara Menjalankan

1. Import database:

   ```powershell
   mysql -u root -p < database.sql
   ```

2. Isi file `.env` di root project. File sudah disediakan dan dibaca otomatis saat aplikasi jalan:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=isi_password_mysql_anda
   DB_NAME=myringnet
   PORT=3000
   SESSION_SECRET=silji-secret
   ```

3. Jalankan aplikasi:

   ```powershell
   node app.js
   ```

4. Buka [http://localhost:3000](http://localhost:3000)

## Akun Demo

- `admin / admin123`
- `pelanggan1 / pelanggan123`
- `teknisi1 / teknisi123`
- `manajemen1 / manajemen123`
