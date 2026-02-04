-- Migration: Add checkedInBy field to track admin/supervisor assisted check-ins
-- This allows admins/supervisors to help agents who don't have phones

ALTER TABLE attendance 
ADD COLUMN checkedInBy CHAR(36) NULL COMMENT 'Admin/Supervisor who performed the check-in on behalf of the agent' AFTER checkInDeviceMAC,
ADD KEY idx_checkedInBy (checkedInBy);

ALTER TABLE attendance
ADD CONSTRAINT fk_attendance_checkedInBy 
FOREIGN KEY (checkedInBy) REFERENCES users(id) ON DELETE SET NULL;
