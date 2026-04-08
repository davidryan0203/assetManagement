-- AlterTable
ALTER TABLE `assets`
  ADD COLUMN `disposalApprovalPending` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `disposalApprovalRequestedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `disposal_approval_requests` (
  `id` VARCHAR(191) NOT NULL,
  `assetId` VARCHAR(191) NOT NULL,
  `requestedById` VARCHAR(191) NOT NULL,
  `recipientEmail` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Declined', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `disposal_approval_requests_token_key`(`token`),
  INDEX `disposal_approval_requests_assetId_idx`(`assetId`),
  INDEX `disposal_approval_requests_requestedById_idx`(`requestedById`),
  INDEX `disposal_approval_requests_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `disposal_approval_requests`
  ADD CONSTRAINT `disposal_approval_requests_assetId_fkey`
  FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disposal_approval_requests`
  ADD CONSTRAINT `disposal_approval_requests_requestedById_fkey`
  FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
