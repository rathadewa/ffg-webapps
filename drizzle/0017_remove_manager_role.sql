-- Hapus role Manager: pindahkan user Manager yang ada ke Administrator, lalu ubah enum
UPDATE users SET role = 'Administrator' WHERE role = 'Manager';
ALTER TABLE users MODIFY COLUMN role ENUM('Superuser','Administrator','Agent','Teknisi') NOT NULL DEFAULT 'Agent';
