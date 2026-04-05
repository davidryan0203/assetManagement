ALTER TABLE `assets`
  ADD COLUMN `associatedToIds` JSON NULL AFTER `associatedToId`;

UPDATE `assets`
SET `associatedToIds` = JSON_ARRAY(`associatedToId`)
WHERE `associatedToId` IS NOT NULL;
