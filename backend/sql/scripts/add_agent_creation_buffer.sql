-- Ajouter la colonne agentCreationBuffer à la table events
-- Permet de configurer le délai avant l'événement pour créer des agents

ALTER TABLE events 
ADD COLUMN agentCreationBuffer INT DEFAULT 120 COMMENT 'Minutes avant le début de l\'événement où la création d\'agents est autorisée (30, 60, 90, ou 120)';

-- Mettre à jour les événements existants avec la valeur par défaut (2h = 120 minutes)
UPDATE events SET agentCreationBuffer = 120 WHERE agentCreationBuffer IS NULL;

SELECT 'Migration completed: agentCreationBuffer column added to events table' as status;
