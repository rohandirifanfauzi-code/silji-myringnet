USE myringnet;

ALTER TABLE notifikasi
  ADD COLUMN status_notifikasi ENUM('pending','scheduled','done') NOT NULL DEFAULT 'pending'
  AFTER status_baca;

UPDATE notifikasi
SET status_notifikasi = CASE
  WHEN status_baca = 'scheduled' THEN 'scheduled'
  ELSE 'pending'
END;

UPDATE notifikasi
INNER JOIN tugas_teknisi ON tugas_teknisi.id = notifikasi.id_tugas
SET notifikasi.status_notifikasi = 'done'
WHERE tugas_teknisi.status = 'selesai';
