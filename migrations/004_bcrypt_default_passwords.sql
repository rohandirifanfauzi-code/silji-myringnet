USE myringnet;

UPDATE users
SET password = '$2b$10$lWFzdy8z02V7i4Oetc4UTu3MR4IHvsaKeCkdJtEPvWfxLU/wV5VHe'
WHERE username = 'admin'
  AND password = 'admin123';

UPDATE users
SET password = '$2b$10$VvdcCnyKUuWln.Gty.HqWeJ.xUexbTwV1m6I0rBG.uyi9MFba.s.K'
WHERE username = 'pelanggan1'
  AND password = 'pelanggan123';

UPDATE users
SET password = '$2b$10$eefpaPAH8NVc9kIFQVR4HeRqJ93jP5SDgHcDC5r/u7VDBXhx1KSJm'
WHERE username = 'teknisi1'
  AND password = 'teknisi123';

UPDATE users
SET password = '$2b$10$VoHh5avPq416Qf2PWv5SB.eCl1SrvMj9eaGsOB893P8TR8rvTRS/C'
WHERE username = 'manajemen1'
  AND password = 'manajemen123';
