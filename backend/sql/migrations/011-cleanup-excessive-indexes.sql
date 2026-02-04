-- Migration 007: Clean up excessive indexes to fix "Too many keys" error
-- MySQL has a 64-key limit per table, need to drop redundant/unused indexes

-- Get info: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users';

-- Drop all indexes except PRIMARY and keep only essential ones
ALTER TABLE `users` 
  DROP INDEX IF EXISTS `cin`,
  DROP INDEX IF EXISTS `phone`,
  DROP INDEX IF EXISTS `idx_cin`,
  DROP INDEX IF EXISTS `idx_phone`,
  DROP INDEX IF EXISTS `whatsappNumber`,
  DROP INDEX IF EXISTS `idx_whatsappNumber`;

-- Keep only essential unique and performance indexes
-- Re-add only the necessary ones
ALTER TABLE `users` 
  ADD UNIQUE INDEX `unique_employeeId` (`employeeId`),
  ADD UNIQUE INDEX `unique_email` (`email`),
  ADD INDEX `idx_cin` (`cin`),
  ADD INDEX `idx_role` (`role`),
  ADD INDEX `idx_status` (`status`),
  ADD INDEX `idx_supervisorId` (`supervisorId`),
  ADD INDEX `idx_createdByUserId` (`createdByUserId`),
  ADD INDEX `idx_validatedBy` (`validatedBy`),
  ADD INDEX `idx_lastLogin` (`lastLogin`);

-- Check count after
-- SELECT COUNT(DISTINCT INDEX_NAME) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users';
