-- Script pour ajouter des coordonnées GPS de test aux agents
-- Casablanca, Morocco (exemple de localisation)

USE security_guard_db;

-- Mise à jour des agents avec des coordonnées autour de Casablanca
-- Centre-ville: 33.5731, -7.5898

-- Agent 1: Centre-ville
UPDATE users 
SET currentLatitude = 33.5731, currentLongitude = -7.5898, lastLocationUpdate = NOW() 
WHERE role = 'agent' AND employeeId LIKE '%001%' 
LIMIT 1;

-- Agent 2: 500m au nord
UPDATE users 
SET currentLatitude = 33.5776, currentLongitude = -7.5898, lastLocationUpdate = NOW() 
WHERE role = 'agent' AND employeeId LIKE '%002%' 
LIMIT 1;

-- Agent 3: 1km à l'est
UPDATE users 
SET currentLatitude = 33.5731, currentLongitude = -7.5758, lastLocationUpdate = NOW() 
WHERE role = 'agent' AND employeeId LIKE '%003%' 
LIMIT 1;

-- Mise à jour de TOUS les agents avec des coordonnées aléatoires autour de Casablanca (rayon 5km)
UPDATE users 
SET 
  currentLatitude = 33.5731 + (RAND() * 0.09 - 0.045),  -- ±5km en latitude
  currentLongitude = -7.5898 + (RAND() * 0.09 - 0.045), -- ±5km en longitude
  lastLocationUpdate = NOW()
WHERE role IN ('agent', 'supervisor') AND currentLatitude IS NULL;

-- Vérification
SELECT 
  employeeId, 
  firstName, 
  lastName, 
  role,
  currentLatitude, 
  currentLongitude,
  CASE 
    WHEN currentLatitude IS NOT NULL THEN 'GPS OK' 
    ELSE 'Pas de GPS' 
  END AS status
FROM users 
WHERE role IN ('agent', 'supervisor')
ORDER BY role, employeeId;
