-- User Domains table for linking purchased domains to stores
CREATE TABLE `user_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`app_id` text,
	`domain` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE INDEX `user_domains_user_idx` ON `user_domains` (`user_id`);
CREATE INDEX `user_domains_app_idx` ON `user_domains` (`app_id`);
CREATE UNIQUE INDEX `user_domains_domain_idx` ON `user_domains` (`domain`);
CREATE UNIQUE INDEX `user_domains_user_domain_idx` ON `user_domains` (`user_id`, `domain`);
