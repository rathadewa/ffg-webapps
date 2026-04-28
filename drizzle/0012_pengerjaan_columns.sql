ALTER TABLE `pengukuran_order_psb`
  ADD COLUMN `pic`               VARCHAR(255)                          DEFAULT NULL,
  ADD COLUMN `status_pengerjaan` ENUM('belum','pickup','done') NOT NULL DEFAULT 'belum',
  ADD COLUMN `pickup_time`       TIMESTAMP                             NULL DEFAULT NULL,
  ADD COLUMN `done_time`         TIMESTAMP                             NULL DEFAULT NULL,
  ADD COLUMN `penyebab_loss`     VARCHAR(50)                           DEFAULT NULL,
  ADD COLUMN `segmen_infra`      VARCHAR(50)                           DEFAULT NULL,
  ADD COLUMN `actsol`            VARCHAR(255)                          DEFAULT NULL,
  ADD COLUMN `evidence`          TEXT                                  DEFAULT NULL;
