-- Migration pour ajouter la table scheduled_backups
-- Date: 2026-02-03

CREATE TABLE IF NOT EXISTS `scheduled_backups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `intervalDays` INT NOT NULL DEFAULT 7,
  `backupType` ENUM('full', 'structure') NOT NULL DEFAULT 'full',
  `retentionCount` INT NOT NULL DEFAULT 3,
  `lastRunAt` DATETIME NULL,
  `nextRunAt` DATETIME NULL,
  `createdBy` CHAR(36) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `enabled_idx` (`enabled`),
  INDEX `nextRunAt_idx` (`nextRunAt`),
  INDEX `createdBy_idx` (`createdBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insérer une configuration par défaut
INSERT INTO `scheduled_backups` (`enabled`, `intervalDays`, `backupType`, `retentionCount`, `nextRunAt`)
VALUES (0, 7, 'full', 3, DATE_ADD(NOW(), INTERVAL 7 DAY))
ON DUPLICATE KEY UPDATE `id` = `id`;
