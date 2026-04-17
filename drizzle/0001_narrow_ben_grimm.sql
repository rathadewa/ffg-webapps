ALTER TABLE `users` ADD `nik` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_nik_unique` UNIQUE(`nik`);