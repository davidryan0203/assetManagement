-- Allow managers to be scoped to multiple sites
ALTER TABLE `users`
ADD COLUMN `managerSiteIds` JSON NULL;

-- Backfill from legacy singular siteId for existing manager accounts
UPDATE `users`
SET `managerSiteIds` = JSON_ARRAY(`siteId`)
WHERE `role` = 'manager' AND `siteId` IS NOT NULL;
