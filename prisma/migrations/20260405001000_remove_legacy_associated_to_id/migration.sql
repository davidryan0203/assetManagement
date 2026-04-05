ALTER TABLE `assets`
  DROP FOREIGN KEY `assets_associatedToId_fkey`;

DROP INDEX `assets_associatedToId_idx` ON `assets`;

ALTER TABLE `assets`
  DROP COLUMN `associatedToId`;
