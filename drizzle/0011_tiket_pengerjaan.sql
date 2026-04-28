CREATE TABLE `tiket_pengerjaan` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `user_ffg_id`   INT          NOT NULL,
  `order_id`      VARCHAR(20)  NOT NULL,
  `score`         INT          NOT NULL DEFAULT 0,
  `catatan`       VARCHAR(500),
  `dikerjakan_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tiket_user_ffg`
    FOREIGN KEY (`user_ffg_id`) REFERENCES `user_ffg`(`id`),
  CONSTRAINT `fk_tiket_order`
    FOREIGN KEY (`order_id`) REFERENCES `pengukuran_order_psb`(`order_id`)
);
