ALTER TABLE `pengukuran_order_psb`
  ADD COLUMN `status` varchar(15) DEFAULT NULL;
--> statement-breakpoint
-- Seed: set semua ke UP dulu
UPDATE `pengukuran_order_psb` SET `status` = 'UP';
--> statement-breakpoint
-- Set 50 random jadi DOWN
UPDATE `pengukuran_order_psb` SET `status` = 'DOWN'
ORDER BY RAND() LIMIT 50;
--> statement-breakpoint
-- Set 10 random jadi NOT FOUND
UPDATE `pengukuran_order_psb` SET `status` = 'NOT FOUND'
ORDER BY RAND() LIMIT 10;
