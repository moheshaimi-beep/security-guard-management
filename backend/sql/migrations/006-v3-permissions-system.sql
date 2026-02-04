-- Migration: V3 Permission System
-- This migration creates the tables for the permission management system

-- ============================================
-- Table: permissions
-- Stores all available permissions in the system
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_permissions_code (code),
    INDEX idx_permissions_module (module),
    INDEX idx_permissions_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: role_permissions
-- Links roles to their default permissions
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id CHAR(36) PRIMARY KEY,
    role ENUM('agent', 'supervisor', 'admin', 'user') NOT NULL,
    permissionId CHAR(36) NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    grantedBy CHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (grantedBy) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_role_permission (role, permissionId),
    INDEX idx_role_permissions_role (role),
    INDEX idx_role_permissions_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: user_permissions
-- Stores user-specific permission overrides (granted or denied)
-- ============================================
CREATE TABLE IF NOT EXISTS user_permissions (
    id CHAR(36) PRIMARY KEY,
    userId CHAR(36) NOT NULL,
    permissionId CHAR(36) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    grantedBy CHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (grantedBy) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_permission (userId, permissionId),
    INDEX idx_user_permissions_user (userId),
    INDEX idx_user_permissions_granted (granted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert default permissions
-- ============================================

-- Module: Dashboard
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'dashboard.view', 'Voir le tableau de bord', 'dashboard', 'view'),
(UUID(), 'dashboard.stats', 'Voir les statistiques', 'dashboard', 'view');

-- Module: Users
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'users.view', 'Voir les utilisateurs', 'users', 'view'),
(UUID(), 'users.create', 'Créer des utilisateurs', 'users', 'create'),
(UUID(), 'users.update', 'Modifier des utilisateurs', 'users', 'update'),
(UUID(), 'users.delete', 'Supprimer des utilisateurs', 'users', 'delete'),
(UUID(), 'users.manage_permissions', 'Gérer les permissions', 'users', 'manage');

-- Module: Events
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'events.view', 'Voir les événements', 'events', 'view'),
(UUID(), 'events.create', 'Créer des événements', 'events', 'create'),
(UUID(), 'events.update', 'Modifier des événements', 'events', 'update'),
(UUID(), 'events.delete', 'Supprimer des événements', 'events', 'delete');

-- Module: Assignments
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'assignments.view', 'Voir les affectations', 'assignments', 'view'),
(UUID(), 'assignments.create', 'Créer des affectations', 'assignments', 'create'),
(UUID(), 'assignments.update', 'Modifier des affectations', 'assignments', 'update'),
(UUID(), 'assignments.delete', 'Supprimer des affectations', 'assignments', 'delete');

-- Module: Attendance
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'attendance.view', 'Voir les pointages', 'attendance', 'view'),
(UUID(), 'attendance.view_own', 'Voir ses propres pointages', 'attendance', 'view'),
(UUID(), 'attendance.create', 'Créer des pointages', 'attendance', 'create'),
(UUID(), 'attendance.update', 'Modifier des pointages', 'attendance', 'update'),
(UUID(), 'attendance.checkin', 'Pointer (check-in/out)', 'attendance', 'create');

-- Module: Reports
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'reports.view', 'Voir les rapports', 'reports', 'view'),
(UUID(), 'reports.export', 'Exporter les rapports', 'reports', 'export'),
(UUID(), 'reports.advanced', 'Rapports avancés', 'reports', 'view');

-- Module: Incidents
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'incidents.view', 'Voir les incidents', 'incidents', 'view'),
(UUID(), 'incidents.create', 'Signaler des incidents', 'incidents', 'create'),
(UUID(), 'incidents.update', 'Modifier des incidents', 'incidents', 'update'),
(UUID(), 'incidents.resolve', 'Résoudre des incidents', 'incidents', 'update'),
(UUID(), 'incidents.delete', 'Supprimer des incidents', 'incidents', 'delete');

-- Module: Notifications
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'notifications.view', 'Voir les notifications', 'notifications', 'view'),
(UUID(), 'notifications.send', 'Envoyer des notifications', 'notifications', 'create'),
(UUID(), 'notifications.broadcast', 'Diffuser des notifications', 'notifications', 'create');

-- Module: Messages
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'messages.view', 'Voir les messages', 'messages', 'view'),
(UUID(), 'messages.send', 'Envoyer des messages', 'messages', 'create'),
(UUID(), 'messages.broadcast', 'Diffuser des messages', 'messages', 'create');

-- Module: Tracking
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'tracking.view', 'Voir la géolocalisation', 'tracking', 'view'),
(UUID(), 'tracking.view_agents', 'Voir position des agents', 'tracking', 'view'),
(UUID(), 'tracking.history', 'Voir historique positions', 'tracking', 'view');

-- Module: SOS
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'sos.trigger', 'Déclencher une alerte SOS', 'sos', 'create'),
(UUID(), 'sos.view', 'Voir les alertes SOS', 'sos', 'view'),
(UUID(), 'sos.respond', 'Répondre aux alertes SOS', 'sos', 'update');

-- Module: Badges
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'badges.view', 'Voir les badges', 'badges', 'view'),
(UUID(), 'badges.award', 'Attribuer des badges', 'badges', 'create'),
(UUID(), 'badges.manage', 'Gérer les badges', 'badges', 'manage');

-- Module: Documents
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'documents.view', 'Voir les documents', 'documents', 'view'),
(UUID(), 'documents.upload', 'Uploader des documents', 'documents', 'create'),
(UUID(), 'documents.verify', 'Vérifier des documents', 'documents', 'update'),
(UUID(), 'documents.delete', 'Supprimer des documents', 'documents', 'delete');

-- Module: Admin
INSERT INTO permissions (id, code, name, module, action) VALUES
(UUID(), 'admin.access', 'Accéder à l''espace admin', 'admin', 'view'),
(UUID(), 'admin.settings', 'Modifier les paramètres', 'admin', 'manage'),
(UUID(), 'admin.logs', 'Voir les logs d''activité', 'admin', 'view'),
(UUID(), 'admin.permissions', 'Gérer les permissions', 'admin', 'manage');

-- ============================================
-- Note: Role permissions should be initialized via the API
-- Call POST /api/permissions/initialize after running this migration
-- ============================================
