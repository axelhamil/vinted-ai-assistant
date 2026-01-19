CREATE TABLE IF NOT EXISTS `studio_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`prompt_template` text NOT NULL,
	`type` text DEFAULT 'custom' NOT NULL,
	`preview_image` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
