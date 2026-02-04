-- Migration V2: Systeme de Gardiennage Intelligent
-- Tables pour tracking GPS, messaging, liveness, fraude

USE security_guard_db;

-- =============================================================================
-- 1. MODIFICATIONS TABLE USERS
-- =============================================================================

-- Ajouter colonnes pour tracer la creation et validation des agents
ALTER TABLE users
ADD COLUMN IF NOT EXISTS created_by_type ENUM('admin', 'supervisor', 'self_registration') DEFAULT 'admin' AFTER deleted_at,
ADD COLUMN IF NOT EXISTS created_by_user_id CHAR(36) DEFAULT NULL AFTER created_by_type,
ADD COLUMN IF NOT EXISTS is_temporary TINYINT(1) DEFAULT 0 AFTER created_by_user_id,
ADD COLUMN IF NOT EXISTS validated_by CHAR(36) DEFAULT NULL AFTER is_temporary,
ADD COLUMN IF NOT EXISTS validated_at DATETIME DEFAULT NULL AFTER validated_by,
ADD COLUMN IF NOT EXISTS last_liveness_check DATETIME DEFAULT NULL AFTER validated_at,
ADD COLUMN IF NOT EXISTS fraud_score INT DEFAULT 0 AFTER last_liveness_check,
ADD COLUMN IF NOT EXISTS device_fingerprints JSON DEFAULT NULL AFTER fraud_score;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_users_created_by_type ON users(created_by_type);
CREATE INDEX IF NOT EXISTS idx_users_is_temporary ON users(is_temporary);

-- =============================================================================
-- 2. TABLE GEO_TRACKING (Historique positions GPS)
-- =============================================================================

DROP TABLE IF EXISTS geo_tracking;

CREATE TABLE geo_tracking (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    event_id CHAR(36) DEFAULT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2) DEFAULT NULL COMMENT 'Precision en metres',
    altitude DECIMAL(8, 2) DEFAULT NULL,
    speed DECIMAL(6, 2) DEFAULT NULL COMMENT 'Vitesse en km/h',
    heading DECIMAL(5, 2) DEFAULT NULL COMMENT 'Direction 0-360 degres',
    battery_level INT DEFAULT NULL,
    is_mock_location TINYINT(1) DEFAULT 0 COMMENT 'Detection GPS spoofing',
    network_type VARCHAR(20) DEFAULT NULL COMMENT 'wifi, 4g, 5g, etc.',
    cell_tower_info JSON DEFAULT NULL COMMENT 'Info triangulation',
    is_within_geofence TINYINT(1) DEFAULT 1,
    distance_from_event DECIMAL(10, 2) DEFAULT NULL COMMENT 'Distance en metres',
    recorded_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_geo_user_event (user_id, event_id),
    INDEX idx_geo_recorded_at (recorded_at),
    INDEX idx_geo_user_time (user_id, recorded_at),
    CONSTRAINT fk_geo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_geo_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. TABLE CONVERSATIONS (Groupes de discussion)
-- =============================================================================

DROP TABLE IF EXISTS conversations;

CREATE TABLE conversations (
    id CHAR(36) NOT NULL,
    event_id CHAR(36) DEFAULT NULL,
    type ENUM('direct', 'group', 'event_broadcast') NOT NULL DEFAULT 'direct',
    name VARCHAR(255) DEFAULT NULL,
    created_by CHAR(36) NOT NULL,
    participants JSON DEFAULT NULL COMMENT 'Liste des user_ids',
    last_message_id CHAR(36) DEFAULT NULL,
    last_message_at DATETIME DEFAULT NULL,
    is_archived TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_conv_event (event_id),
    INDEX idx_conv_created_by (created_by),
    INDEX idx_conv_last_message (last_message_at),
    CONSTRAINT fk_conv_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    CONSTRAINT fk_conv_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. TABLE MESSAGES (Chat temps reel)
-- =============================================================================

DROP TABLE IF EXISTS messages;

CREATE TABLE messages (
    id CHAR(36) NOT NULL,
    conversation_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    recipient_id CHAR(36) DEFAULT NULL COMMENT 'NULL si broadcast',
    event_id CHAR(36) DEFAULT NULL,
    message_type ENUM('text', 'image', 'file', 'location', 'voice', 'system') NOT NULL DEFAULT 'text',
    content TEXT DEFAULT NULL,
    file_url TEXT DEFAULT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    file_size INT DEFAULT NULL,
    file_mime_type VARCHAR(100) DEFAULT NULL,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    delivered_at DATETIME DEFAULT NULL,
    read_at DATETIME DEFAULT NULL,
    is_broadcast TINYINT(1) DEFAULT 0,
    is_urgent TINYINT(1) DEFAULT 0,
    reply_to_id CHAR(36) DEFAULT NULL COMMENT 'Message en reponse',
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,

    PRIMARY KEY (id),
    INDEX idx_msg_conversation (conversation_id),
    INDEX idx_msg_sender (sender_id),
    INDEX idx_msg_recipient (recipient_id),
    INDEX idx_msg_event (event_id),
    INDEX idx_msg_created (created_at),
    CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_msg_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. TABLE LIVENESS_LOGS (Verification identite)
-- =============================================================================

DROP TABLE IF EXISTS liveness_logs;

CREATE TABLE liveness_logs (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    check_type ENUM('facial', 'document', 'combined') NOT NULL,
    session_id VARCHAR(100) DEFAULT NULL,
    result ENUM('passed', 'failed', 'inconclusive', 'timeout') NOT NULL,
    confidence_score DECIMAL(5, 4) DEFAULT NULL,
    checks_performed JSON DEFAULT NULL COMMENT 'Details des verifications',
    failure_reasons JSON DEFAULT NULL,
    frames_analyzed INT DEFAULT NULL,
    device_info JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    duration_ms INT DEFAULT NULL COMMENT 'Duree verification en ms',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_liveness_user (user_id),
    INDEX idx_liveness_created (created_at),
    INDEX idx_liveness_result (result),
    CONSTRAINT fk_liveness_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. TABLE FRAUD_ATTEMPTS (Tentatives de fraude)
-- =============================================================================

DROP TABLE IF EXISTS fraud_attempts;

CREATE TABLE fraud_attempts (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) DEFAULT NULL,
    event_id CHAR(36) DEFAULT NULL,
    attempt_type ENUM(
        'gps_spoofing',
        'photo_spoofing',
        'video_spoofing',
        'screen_spoofing',
        'document_forgery',
        'multiple_device',
        'out_of_zone',
        'time_manipulation',
        'identity_mismatch',
        'root_device',
        'vpn_detected',
        'other'
    ) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    description TEXT DEFAULT NULL,
    details JSON DEFAULT NULL COMMENT 'Donnees techniques',
    evidence_photo LONGTEXT DEFAULT NULL COMMENT 'Capture ecran/photo base64',
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    device_fingerprint VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    action_taken ENUM('blocked', 'warned', 'logged', 'escalated', 'ignored') DEFAULT 'logged',
    blocked_until DATETIME DEFAULT NULL,
    reviewed_by CHAR(36) DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    review_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_fraud_user (user_id),
    INDEX idx_fraud_event (event_id),
    INDEX idx_fraud_type (attempt_type),
    INDEX idx_fraud_severity (severity),
    INDEX idx_fraud_created (created_at),
    CONSTRAINT fk_fraud_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_fraud_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    CONSTRAINT fk_fraud_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. TABLE SOS_ALERTS (Alertes urgence)
-- =============================================================================

DROP TABLE IF EXISTS sos_alerts;

CREATE TABLE sos_alerts (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    event_id CHAR(36) DEFAULT NULL,
    alert_type ENUM('sos', 'medical', 'security', 'fire', 'other') NOT NULL DEFAULT 'sos',
    status ENUM('active', 'acknowledged', 'responding', 'resolved', 'false_alarm') NOT NULL DEFAULT 'active',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2) DEFAULT NULL,
    photo TEXT DEFAULT NULL,
    voice_note_url TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    acknowledged_by CHAR(36) DEFAULT NULL,
    acknowledged_at DATETIME DEFAULT NULL,
    resolved_by CHAR(36) DEFAULT NULL,
    resolved_at DATETIME DEFAULT NULL,
    resolution_notes TEXT DEFAULT NULL,
    response_time_seconds INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_sos_user (user_id),
    INDEX idx_sos_event (event_id),
    INDEX idx_sos_status (status),
    INDEX idx_sos_created (created_at),
    CONSTRAINT fk_sos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sos_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. TABLE DOCUMENT_VERIFICATIONS (Verification CIN Document AI)
-- =============================================================================

DROP TABLE IF EXISTS document_verifications;

CREATE TABLE document_verifications (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    document_type ENUM('national_id', 'passport', 'driver_license', 'other') NOT NULL,
    verification_method ENUM('document_ai', 'manual', 'ocr') NOT NULL DEFAULT 'document_ai',
    result ENUM('authentic', 'suspicious', 'forged', 'unreadable', 'expired') NOT NULL,
    confidence_score DECIMAL(5, 4) DEFAULT NULL,
    extracted_data JSON DEFAULT NULL COMMENT 'Donnees extraites du document',
    mrz_data JSON DEFAULT NULL COMMENT 'Zone lisible machine',
    hologram_detected TINYINT(1) DEFAULT NULL,
    tampering_detected TINYINT(1) DEFAULT 0,
    expiry_date DATE DEFAULT NULL,
    is_expired TINYINT(1) DEFAULT 0,
    document_number VARCHAR(50) DEFAULT NULL,
    matching_score DECIMAL(5, 4) DEFAULT NULL COMMENT 'Correspondance avec profil',
    front_image TEXT DEFAULT NULL,
    back_image TEXT DEFAULT NULL,
    verification_details JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    device_info JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_docver_user (user_id),
    INDEX idx_docver_result (result),
    INDEX idx_docver_created (created_at),
    CONSTRAINT fk_docver_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. VUES UTILES
-- =============================================================================

-- Vue: Agents en ligne avec position
CREATE OR REPLACE VIEW v_agents_online AS
SELECT
    u.id,
    u.employee_id,
    u.first_name,
    u.last_name,
    u.profile_photo,
    u.role,
    u.status,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    u.is_temporary,
    u.created_by_type,
    s.first_name AS supervisor_first_name,
    s.last_name AS supervisor_last_name
FROM users u
LEFT JOIN users s ON u.supervisor_id = s.id
WHERE u.status = 'active'
AND u.role IN ('agent', 'supervisor')
AND u.last_location_update > DATE_SUB(NOW(), INTERVAL 15 MINUTE);

-- Vue: Alertes actives
CREATE OR REPLACE VIEW v_active_alerts AS
SELECT
    s.id,
    s.alert_type,
    s.status,
    s.latitude,
    s.longitude,
    s.created_at,
    u.first_name,
    u.last_name,
    u.phone,
    e.name AS event_name
FROM sos_alerts s
JOIN users u ON s.user_id = u.id
LEFT JOIN events e ON s.event_id = e.id
WHERE s.status IN ('active', 'acknowledged', 'responding')
ORDER BY s.created_at DESC;

-- Vue: Statistiques fraude par jour
CREATE OR REPLACE VIEW v_fraud_stats_daily AS
SELECT
    DATE(created_at) AS date,
    attempt_type,
    severity,
    COUNT(*) AS count,
    COUNT(DISTINCT user_id) AS unique_users
FROM fraud_attempts
WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), attempt_type, severity;

-- =============================================================================
-- 10. TRIGGERS
-- =============================================================================

-- Trigger: Mettre a jour fraud_score utilisateur
DELIMITER //
CREATE TRIGGER IF NOT EXISTS tr_update_fraud_score
AFTER INSERT ON fraud_attempts
FOR EACH ROW
BEGIN
    DECLARE score_increment INT DEFAULT 0;

    -- Calculer l'increment selon la severite
    CASE NEW.severity
        WHEN 'low' THEN SET score_increment = 5;
        WHEN 'medium' THEN SET score_increment = 15;
        WHEN 'high' THEN SET score_increment = 30;
        WHEN 'critical' THEN SET score_increment = 50;
    END CASE;

    -- Mettre a jour le score
    IF NEW.user_id IS NOT NULL THEN
        UPDATE users
        SET fraud_score = fraud_score + score_increment
        WHERE id = NEW.user_id;
    END IF;
END//
DELIMITER ;

-- Trigger: Mettre a jour last_message dans conversation
DELIMITER //
CREATE TRIGGER IF NOT EXISTS tr_update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE conversations
    SET last_message_id = NEW.id,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
END//
DELIMITER ;

-- =============================================================================
-- RESULTAT
-- =============================================================================

SELECT 'Migration V2 completed successfully!' AS Message;
SELECT 'Tables created: geo_tracking, conversations, messages, liveness_logs, fraud_attempts, sos_alerts, document_verifications' AS Details;
