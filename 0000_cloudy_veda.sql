CREATE TABLE `world_saves` (
	`owner_key` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`start_year` integer NOT NULL,
	`map_year` integer NOT NULL,
	`day` integer NOT NULL,
	`world_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_key`, `id`)
);
