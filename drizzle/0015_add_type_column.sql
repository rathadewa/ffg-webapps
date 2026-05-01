ALTER TABLE `pengukuran_order_psb`
  ADD COLUMN `order_type` ENUM('logic','fisik') NOT NULL DEFAULT 'logic';
