-- Security Guard Management Database Schema for MySQL 5.7 (XAMPP)
-- Execute this script in phpMyAdmin

-- Create database
CREATE DATABASE IF NOT EXISTS security_guard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE security_guard_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20),
    role ENUM('agent', 'supervisor', 'admin') DEFAULT 'agent',
    profile_photo TEXT,
    facial_vector TEXT,
    facial_vector_updated_at DATETIME,
    address TEXT,
    date_of_birth DATE,
    hire_date DATE,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login DATETIME,
    notification_preferences JSON,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_email (email),
    INDEX idx_employee_id (employee_id),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('regular', 'special', 'emergency') DEFAULT 'regular',
    location VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geo_radius INT DEFAULT 100,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    check_in_time TIME NOT NULL,
    check_out_time TIME NOT NULL,
    late_threshold INT DEFAULT 15,
    required_agents INT DEFAULT 1,
    status ENUM('draft', 'scheduled', 'active', 'completed', 'cancelled') DEFAULT 'draft',
    recurrence JSON,
    created_by VARCHAR(36) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_status (status),
    INDEX idx_start_date (start_date),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB;

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(36) PRIMARY KEY,
    agent_id VARCHAR(36) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    assigned_by VARCHAR(36) NOT NULL,
    role ENUM('primary', 'backup', 'supervisor') DEFAULT 'primary',
    status ENUM('pending', 'confirmed', 'declined', 'cancelled') DEFAULT 'pending',
    confirmed_at DATETIME,
    notes TEXT,
    notification_sent TINYINT(1) DEFAULT 0,
    notification_sent_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_agent_id (agent_id),
    INDEX idx_event_id (event_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(36) PRIMARY KEY,
    agent_id VARCHAR(36) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    check_in_photo TEXT,
    check_out_photo TEXT,
    check_in_method ENUM('facial', 'manual', 'qrcode') DEFAULT 'facial',
    check_out_method ENUM('facial', 'manual', 'qrcode'),
    facial_match_score DECIMAL(5, 4),
    status ENUM('present', 'late', 'absent', 'excused', 'early_departure') DEFAULT 'present',
    is_within_geofence TINYINT(1) DEFAULT 1,
    distance_from_location INT,
    total_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    notes TEXT,
    verified_by VARCHAR(36),
    verified_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_agent_id (agent_id),
    INDEX idx_event_id (event_id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    UNIQUE KEY unique_attendance (agent_id, event_id, date)
) ENGINE=InnoDB;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('assignment', 'reminder', 'attendance', 'late_alert', 'absence_alert', 'schedule_change', 'system', 'general') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel ENUM('email', 'sms', 'whatsapp', 'push', 'in_app') NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed', 'read') DEFAULT 'pending',
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    failed_at DATETIME,
    failure_reason TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    metadata JSON,
    external_id VARCHAR(255),
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    scheduled_for DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB;

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36),
    description TEXT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSON,
    location JSON,
    status ENUM('success', 'failure', 'warning') DEFAULT 'success',
    error_message TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_entity_type (entity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Insert default admin user (password: Admin@123)
INSERT INTO users (id, employee_id, first_name, last_name, email, password, phone, role, status, notification_preferences)
VALUES (
    UUID(),
    'ADMIN001',
    'Admin',
    'System',
    'admin@securityguard.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4tF1EQyLGPZG6xXm',
    '+33600000000',
    'admin',
    'active',
    '{"email": true, "sms": true, "whatsapp": true, "push": true}'
);

-- Show success message
SELECT 'Database security_guard_db created successfully!' AS Message;
SELECT 'Admin user created: admin@securityguard.com / Admin@123' AS Info;
