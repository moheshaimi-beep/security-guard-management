-- Add facial descriptor column to users table
-- This column stores the face-api.js descriptor array as JSON string

ALTER TABLE Users ADD COLUMN IF NOT EXISTS facialDescriptor LONGTEXT COMMENT 'Facial descriptor JSON array for face-api.js recognition';

-- Verify the column was added
SHOW COLUMNS FROM Users WHERE Field = 'facialDescriptor';
