/**
 * Utilitaire pour gérer l'assignation automatique des superviseurs aux zones
 */

/**
 * Assigne automatiquement un superviseur à une zone s'il a une affectation dans cette zone
 * @param {Object} params - Paramètres
 * @param {string} params.supervisorId - ID du superviseur
 * @param {string} params.zoneId - ID de la zone
 * @param {Object} params.Zone - Modèle Sequelize Zone
 */
async function assignSupervisorToZone({ supervisorId, zoneId, Zone }) {
  try {
    if (!supervisorId || !zoneId) {
      return { success: false, message: 'supervisorId et zoneId requis' };
    }

    // Récupérer la zone
    const zone = await Zone.findByPk(zoneId);
    if (!zone) {
      return { success: false, message: 'Zone non trouvée' };
    }

    // Parser les superviseurs existants
    let supervisors = [];
    if (zone.supervisors) {
      if (typeof zone.supervisors === 'string') {
        try {
          supervisors = JSON.parse(zone.supervisors);
        } catch (e) {
          supervisors = [];
        }
      } else if (Array.isArray(zone.supervisors)) {
        supervisors = zone.supervisors;
      } else if (typeof zone.supervisors === 'object') {
        supervisors = Object.values(zone.supervisors);
      }

      if (!Array.isArray(supervisors)) {
        supervisors = [];
      }
    }

    // Ajouter le superviseur s'il n'est pas déjà présent
    if (!supervisors.includes(supervisorId)) {
      supervisors.push(supervisorId);
      
      await zone.update({
        supervisors: JSON.stringify(supervisors)
      });

      console.log(`✅ Superviseur ${supervisorId} assigné à la zone ${zone.name}`);
      return { success: true, message: 'Superviseur assigné à la zone' };
    }

    return { success: true, message: 'Superviseur déjà assigné' };
  } catch (error) {
    console.error('❌ Erreur assignSupervisorToZone:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Retire un superviseur d'une zone
 * @param {Object} params - Paramètres
 * @param {string} params.supervisorId - ID du superviseur
 * @param {string} params.zoneId - ID de la zone
 * @param {Object} params.Zone - Modèle Sequelize Zone
 */
async function removeSupervisorFromZone({ supervisorId, zoneId, Zone }) {
  try {
    if (!supervisorId || !zoneId) {
      return { success: false, message: 'supervisorId et zoneId requis' };
    }

    const zone = await Zone.findByPk(zoneId);
    if (!zone) {
      return { success: false, message: 'Zone non trouvée' };
    }

    // Parser les superviseurs existants
    let supervisors = [];
    if (zone.supervisors) {
      if (typeof zone.supervisors === 'string') {
        try {
          supervisors = JSON.parse(zone.supervisors);
        } catch (e) {
          supervisors = [];
        }
      } else if (Array.isArray(zone.supervisors)) {
        supervisors = zone.supervisors;
      } else if (typeof zone.supervisors === 'object') {
        supervisors = Object.values(zone.supervisors);
      }

      if (!Array.isArray(supervisors)) {
        supervisors = [];
      }
    }

    // Retirer le superviseur
    const index = supervisors.indexOf(supervisorId);
    if (index > -1) {
      supervisors.splice(index, 1);
      
      await zone.update({
        supervisors: supervisors.length > 0 ? JSON.stringify(supervisors) : null
      });

      console.log(`✅ Superviseur ${supervisorId} retiré de la zone ${zone.name}`);
      return { success: true, message: 'Superviseur retiré de la zone' };
    }

    return { success: true, message: 'Superviseur non présent dans la zone' };
  } catch (error) {
    console.error('❌ Erreur removeSupervisorFromZone:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  assignSupervisorToZone,
  removeSupervisorFromZone
};
