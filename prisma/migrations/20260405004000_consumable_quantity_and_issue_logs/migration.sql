-- Add quantity field to assets to support consumable stock tracking
ALTER TABLE `assets`
ADD COLUMN `quantity` INTEGER NOT NULL DEFAULT 0;

-- Issue log for consumable stock movements
CREATE TABLE `consumable_issue_logs` (
  `id` VARCHAR(191) NOT NULL,
  `consumableId` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `issuedTo` TEXT NULL,
  `notes` TEXT NULL,
  `issuedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `consumable_issue_logs_consumableId_idx`(`consumableId`),
  INDEX `consumable_issue_logs_issuedById_idx`(`issuedById`),
  CONSTRAINT `consumable_issue_logs_consumableId_fkey`
    FOREIGN KEY (`consumableId`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consumable_issue_logs_issuedById_fkey`
    FOREIGN KEY (`issuedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
