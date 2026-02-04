/**
 * Database cleanup utility - removes excessive indexes to fix "Too many keys" error
 * Runs on server startup to ensure clean database state
 */

const fs = require('fs');
const path = require('path');

async function cleanupDatabaseIndexes(sequelize) {
  try {
    console.log('🔧 Checking database indexes...');
    
    // Get current index count
    const [result] = await sequelize.query(
      `SELECT COUNT(DISTINCT INDEX_NAME) as idx_count 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users'`
    );
    
    const currentIndexCount = result[0].idx_count;
    console.log(`📊 Current index count on users table: ${currentIndexCount}`);
    
    // If over 50 indexes, run cleanup
    if (currentIndexCount > 50) {
      console.log('⚠️  Too many indexes detected, running cleanup...');
      
      // Drop problematic indexes
      const dropQueries = [
        'ALTER TABLE `users` DROP INDEX IF EXISTS `cin`',
        'ALTER TABLE `users` DROP INDEX IF EXISTS `phone`',
        'ALTER TABLE `users` DROP INDEX IF EXISTS `whatsappNumber`',
        'ALTER TABLE `users` DROP INDEX IF EXISTS `idx_cin`',
        'ALTER TABLE `users` DROP INDEX IF EXISTS `idx_phone`',
        'ALTER TABLE `users` DROP INDEX IF EXISTS `idx_whatsappNumber`'
      ];
      
      for (const query of dropQueries) {
        try {
          await sequelize.query(query);
          console.log(`✅ ${query}`);
        } catch (err) {
          // Index might not exist, that's ok
          console.log(`ℹ️  ${query.split(' ').pop()} - already removed or doesn't exist`);
        }
      }
      
      // Re-add only essential indexes
      const addQueries = [
        'ALTER TABLE `users` ADD UNIQUE INDEX `unique_employeeId` (`employeeId`) IF NOT EXISTS',
        'ALTER TABLE `users` ADD UNIQUE INDEX `unique_email` (`email`) IF NOT EXISTS',
        'ALTER TABLE `users` ADD INDEX `idx_cin` (`cin`) IF NOT EXISTS',
        'ALTER TABLE `users` ADD INDEX `idx_role` (`role`) IF NOT EXISTS',
        'ALTER TABLE `users` ADD INDEX `idx_status` (`status`) IF NOT EXISTS',
        'ALTER TABLE `users` ADD INDEX `idx_supervisorId` (`supervisorId`) IF NOT EXISTS',
        'ALTER TABLE `users` ADD INDEX `idx_createdByUserId` (`createdByUserId`) IF NOT EXISTS',
        'ALTER TABLE `users` ADD INDEX `idx_validatedBy` (`validatedBy`) IF NOT EXISTS',
        'ALTER TABLE `users` ADD INDEX `idx_lastLogin` (`lastLogin`) IF NOT EXISTS'
      ];
      
      for (const query of addQueries) {
        try {
          await sequelize.query(query);
          console.log(`✅ ${query}`);
        } catch (err) {
          console.log(`ℹ️  Index already exists: ${query.split('`')[1]}`);
        }
      }
      
      // Check final count
      const [finalResult] = await sequelize.query(
        `SELECT COUNT(DISTINCT INDEX_NAME) as idx_count 
         FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users'`
      );
      
      console.log(`✅ Cleanup complete! Final index count: ${finalResult[0].idx_count}`);
    } else {
      console.log('✅ Index count is healthy');
    }
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error.message);
    // Don't fail the server startup, just log the warning
  }
}

module.exports = { cleanupDatabaseIndexes };
