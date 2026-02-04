-- Add facial verification fields to attendance table
ALTER TABLE attendance ADD COLUMN facialVerified BOOLEAN DEFAULT 0 COMMENT 'Whether facial verification was successful';
ALTER TABLE attendance ADD COLUMN facialVerifiedAt DATETIME NULL COMMENT 'Timestamp of facial verification';

-- Create index for faster queries
CREATE INDEX idx_facial_verified ON attendance(facialVerified);
