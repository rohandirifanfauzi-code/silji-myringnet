ALTER TABLE tagihan
  MODIFY status_tagihan ENUM('BELUM BAYAR','LUNAS','belum_bayar','lunas') NOT NULL DEFAULT 'BELUM BAYAR';

UPDATE tagihan
SET status_tagihan = CASE status_tagihan
  WHEN 'BELUM BAYAR' THEN 'belum_bayar'
  WHEN 'LUNAS' THEN 'lunas'
  ELSE status_tagihan
END;

ALTER TABLE tagihan
  MODIFY status_tagihan ENUM('belum_bayar','lunas') NOT NULL DEFAULT 'belum_bayar';

ALTER TABLE keluhan
  MODIFY status ENUM('BARU','DIPROSES','SELESAI','pending','proses','selesai') NOT NULL DEFAULT 'BARU';

UPDATE keluhan
SET status = CASE status
  WHEN 'BARU' THEN 'pending'
  WHEN 'DIPROSES' THEN 'proses'
  WHEN 'SELESAI' THEN 'selesai'
  ELSE status
END;

ALTER TABLE keluhan
  MODIFY status ENUM('pending','proses','selesai') NOT NULL DEFAULT 'pending';

ALTER TABLE tugas_teknisi
  MODIFY status ENUM('DITUGASKAN','PROSES','SELESAI','pending','proses','selesai') NOT NULL DEFAULT 'DITUGASKAN';

UPDATE tugas_teknisi
SET status = CASE status
  WHEN 'DITUGASKAN' THEN 'pending'
  WHEN 'PROSES' THEN 'proses'
  WHEN 'SELESAI' THEN 'selesai'
  ELSE status
END;

ALTER TABLE tugas_teknisi
  MODIFY status ENUM('pending','proses','selesai') NOT NULL DEFAULT 'pending';

ALTER TABLE notifikasi
  MODIFY status_baca ENUM('BELUM','SUDAH','unread','read','scheduled') NOT NULL DEFAULT 'BELUM';

UPDATE notifikasi
SET status_baca = CASE status_baca
  WHEN 'BELUM' THEN 'unread'
  WHEN 'SUDAH' THEN 'read'
  ELSE status_baca
END;

ALTER TABLE notifikasi
  MODIFY status_baca ENUM('unread','read','scheduled') NOT NULL DEFAULT 'unread';
