-- Migration: Fix Too Many Keys Error
-- Removes excessive unique constraints to comply with MySQL 64-key limit
-- Replaces them with regular indexes for query performance

-- Drop problematic unique constraints from users table
ALTER TABLE `users` 
  DROP INDEX `cin`,
  DROP INDEX `phone`;

-- Add regular indexes instead (not unique, counts differently in MySQL)
ALTER TABLE `users` 
  ADD INDEX `idx_cin` (`cin`),
  ADD INDEX `idx_phone` (`phone`);
