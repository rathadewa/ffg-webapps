CREATE TABLE `ffg_indibiz` (
	`no_order` bigint NOT NULL,
	`sto` varchar(255),
	`external` varchar(255),
	`speedy` varchar(255),
	`last_update` date,
	`order_id` varchar(255),
	`pots` varchar(255),
	CONSTRAINT `ffg_indibiz_no_order` PRIMARY KEY(`no_order`)
);
--> statement-breakpoint
CREATE TABLE `ffg_indihome` (
	`no_order` bigint NOT NULL,
	`sto` varchar(255),
	`external` varchar(255),
	`speedy` varchar(255),
	`last_update` date,
	`order_id` varchar(255),
	CONSTRAINT `ffg_indihome_no_order` PRIMARY KEY(`no_order`)
);
