-- Migration: Create user_documents table
-- Cette table stocke les documents scannés des utilisateurs (Agents/Responsables)

USE security_guard_db;

-- Supprimer la table si elle existe (pour reset)
DROP TABLE IF EXISTS document_config;
DROP TABLE IF EXISTS user_documents;

-- User Documents table
CREATE TABLE user_documents (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    document_type ENUM(
        'cin_recto',
        'cin_verso',
        'photo',
        'cv',
        'fiche_anthropometrique',
        'permis',
        'diplome',
        'autre'
    ) NOT NULL,
    custom_name VARCHAR(255) DEFAULT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(10) NOT NULL,
    file_content LONGTEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    is_required TINYINT(1) DEFAULT 0,
    is_verified TINYINT(1) DEFAULT 0,
    verified_by CHAR(36) DEFAULT NULL,
    verified_at DATETIME DEFAULT NULL,
    expiry_date DATE DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT DEFAULT NULL,
    uploaded_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    INDEX idx_user_id (user_id),
    INDEX idx_document_type (document_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajouter les foreign keys séparément
ALTER TABLE user_documents
    ADD CONSTRAINT fk_user_documents_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_documents
    ADD CONSTRAINT fk_user_documents_verified_by
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE user_documents
    ADD CONSTRAINT fk_user_documents_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Configuration des tailles max par type de document
CREATE TABLE document_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_type VARCHAR(50) NOT NULL UNIQUE,
    max_file_size INT NOT NULL DEFAULT 5242880,
    allowed_extensions JSON DEFAULT NULL,
    is_required TINYINT(1) DEFAULT 0,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insérer les configurations par défaut
INSERT INTO document_config (document_type, max_file_size, is_required, description, allowed_extensions) VALUES
    ('cin_recto', 5242880, 0, 'Carte Identite Nationale - Recto', '["pdf", "jpg", "jpeg", "png"]'),
    ('cin_verso', 5242880, 0, 'Carte Identite Nationale - Verso', '["pdf", "jpg", "jpeg", "png"]'),
    ('photo', 2097152, 0, 'Photo identite', '["jpg", "jpeg", "png"]'),
    ('cv', 10485760, 0, 'Curriculum Vitae', '["pdf", "jpg", "jpeg", "png"]'),
    ('fiche_anthropometrique', 5242880, 0, 'Fiche anthropometrique', '["pdf", "jpg", "jpeg", "png"]'),
    ('permis', 5242880, 0, 'Permis de conduire', '["pdf", "jpg", "jpeg", "png"]'),
    ('diplome', 10485760, 0, 'Diplome ou certificat', '["pdf", "jpg", "jpeg", "png"]'),
    ('autre', 10485760, 0, 'Autres documents', '["pdf", "jpg", "jpeg", "png"]');

SELECT 'Table user_documents created successfully!' AS Message;
