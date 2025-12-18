-- Add custom_subdomain field to apps table for user-customizable store URLs
ALTER TABLE apps ADD COLUMN custom_subdomain TEXT;

-- Create unique index to ensure subdomains are unique across all apps
CREATE UNIQUE INDEX apps_custom_subdomain_idx ON apps(custom_subdomain);
