-- Ajouter les informations d'appareil à la table attendance
ALTER TABLE attendance 
  ADD COLUMN checkInDeviceName VARCHAR(255) NULL COMMENT 'Nom de l\'appareil lors du check-in',
  ADD COLUMN checkInDeviceIP VARCHAR(45) NULL COMMENT 'Adresse IP lors du check-in',
  ADD COLUMN checkInDeviceMAC VARCHAR(17) NULL COMMENT 'Adresse MAC lors du check-in',
  ADD COLUMN checkOutDeviceName VARCHAR(255) NULL COMMENT 'Nom de l\'appareil lors du check-out',
  ADD COLUMN checkOutDeviceIP VARCHAR(45) NULL COMMENT 'Adresse IP lors du check-out',
  ADD COLUMN checkOutDeviceMAC VARCHAR(17) NULL COMMENT 'Adresse MAC lors du check-out';
