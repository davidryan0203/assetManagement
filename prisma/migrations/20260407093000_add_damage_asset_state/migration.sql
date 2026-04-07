ALTER TABLE `assets`
  MODIFY COLUMN `assetState` ENUM('In Store', 'Assigned', 'Under Repair', 'Damage', 'Retired', 'Disposed', 'Lost', 'Missing') NOT NULL DEFAULT 'In Store';
