-- Migration: Add 'user' role to users table
-- This migration adds the 'user' role to the existing ENUM

-- For MySQL 8.0+
ALTER TABLE users MODIFY COLUMN role ENUM('agent', 'supervisor', 'admin', 'user') NOT NULL DEFAULT 'agent';

-- Note: If you're using MySQL 5.7, you may need to recreate the column:
-- This is a safer approach that works on all MySQL versions:
--
-- ALTER TABLE users ADD COLUMN role_new ENUM('agent', 'supervisor', 'admin', 'user') NOT NULL DEFAULT 'agent';
-- UPDATE users SET role_new = role;
-- ALTER TABLE users DROP COLUMN role;
-- ALTER TABLE users CHANGE role_new role ENUM('agent', 'supervisor', 'admin', 'user') NOT NULL DEFAULT 'agent';
