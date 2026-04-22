CREATE TABLE `pengukuran_order_psb` (
	`order_id`    varchar(20)  NOT NULL,
	`source`      varchar(10),
	`sto`         varchar(255),
	`external`    varchar(255),
	`speedy`      varchar(255),
	`last_update` varchar(12),
	`pots`        varchar(255),
	CONSTRAINT `pengukuran_order_psb_order_id` PRIMARY KEY(`order_id`)
);
--> statement-breakpoint
DELETE FROM `ffg_indihome`;
--> statement-breakpoint
DELETE FROM `ffg_indibiz`;
--> statement-breakpoint
DROP TABLE `ffg_indibiz`;
--> statement-breakpoint
DROP TABLE `ffg_indihome`;
