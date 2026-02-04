-- Migration: Ajout des champs GPS aux utilisateurs (agents/responsables)
-- Date: 2026-01-20
-- Description: Ajoute les colonnes latitude et longitude pour permettre le filtrage par proximité

USE security_guard_db;

-- Ajouter les colonnes GPS à la table users
ALTER TABLE users 
ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL COMMENT 'Latitude GPS du domicile/base de l''agent',
ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL COMMENT 'Longitude GPS du domicile/base de l''agent',
ADD COLUMN address_updated_at DATETIME DEFAULT NULL COMMENT 'Date de dernière mise à jour de l''adresse GPS';

-- Créer des index pour améliorer les performances des requêtes de proximité
CREATE INDEX idx_users_gps ON users(latitude, longitude);

-- Afficher le résultat
SELECT 'Migration 007: Colonnes GPS ajoutées avec succès à la table users' AS status;

-- Exemple de mise à jour (à adapter avec les vraies coordonnées)
-- UPDATE users SET latitude = 33.5731, longitude = -7.5898, address_updated_at = NOW() WHERE employee_id = 'AGT001';
