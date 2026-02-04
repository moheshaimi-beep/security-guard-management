/**
 * Routes pour la gestion des pointages avec détection de doublons
 * Intègre les nouvelles APIs pour éviter les doubles check-ins
 */

const express = require('express');
const router = express.Router();
const attendanceDuplicateController = require('../controllers/attendanceDuplicateController');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * POST /api/attendance/check-in-secure
 * Check-in avec détection de doublon
 * Accessible par agents, superviseurs et admins
 */
router.post('/check-in-secure', 
  authenticate,
  attendanceDuplicateController.checkInWithDuplicateDetection
);

/**
 * GET /api/attendance/status
 * Vérifier le statut de pointage pour un agent/événement
 * Query params: agentId (optionnel), eventId (requis)
 */
router.get('/status', 
  authenticate,
  attendanceDuplicateController.checkAttendanceStatus
);

/**
 * GET /api/attendance/with-source
 * Récupérer les pointages avec information de source
 * Accessible par superviseurs et admins
 */
router.get('/with-source', 
  authorize('supervisor', 'admin'),
  attendanceDuplicateController.getAttendanceWithSource
);

/**
 * GET /api/attendance/duplicate-report
 * Rapport sur les tentatives de doublons détectées
 * Accessible par admins seulement
 */
router.get('/duplicate-report', 
  authorize('admin'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Cette route pourrait loguer les tentatives de doublons
      // Pour l'instant, on retourne une structure vide
      res.json({
        success: true,
        data: {
          duplicateAttempts: [],
          stats: {
            totalAttempts: 0,
            preventedDuplicates: 0,
            bySource: {
              admin: 0,
              agent: 0,
              supervisor: 0
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ DUPLICATE REPORT ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du rapport'
      });
    }
  }
);

/**
 * POST /api/attendance/bulk-check-status
 * Vérifier le statut de plusieurs agents pour un événement
 * Body: { eventId, agentIds: [] }
 */
router.post('/bulk-check-status',
  authorize('supervisor', 'admin'),
  async (req, res) => {
    try {
      const { eventId, agentIds } = req.body;
      const { checkExistingAttendance } = require('../controllers/attendanceDuplicateController');

      if (!eventId || !Array.isArray(agentIds)) {
        return res.status(400).json({
          success: false,
          message: 'eventId et agentIds (array) requis'
        });
      }

      const results = await Promise.all(
        agentIds.map(async (agentId) => {
          const existing = await checkExistingAttendance(agentId, eventId);
          return {
            agentId,
            hasAttendance: !!existing,
            attendance: existing,
            sourceInfo: existing ? {
              source: existing.checkInSource || 'unknown',
              checkedInBy: existing.checkedInByUser,
              message: getSourceMessage(existing)
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: {
          eventId,
          results,
          stats: {
            total: agentIds.length,
            withAttendance: results.filter(r => r.hasAttendance).length,
            withoutAttendance: results.filter(r => !r.hasAttendance).length
          }
        }
      });

    } catch (error) {
      console.error('❌ BULK CHECK STATUS ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification en masse'
      });
    }
  }
);

/**
 * GET /api/attendance/source-stats
 * Statistiques par source de pointage
 */
router.get('/source-stats',
  authorize('supervisor', 'admin'),
  async (req, res) => {
    try {
      const { startDate, endDate, eventId } = req.query;
      const db = require('../config/database');

      let whereClause = 'WHERE a.deletedAt IS NULL';
      const params = [];

      if (startDate && endDate) {
        whereClause += ' AND a.date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      if (eventId) {
        whereClause += ' AND a.eventId = ?';
        params.push(eventId);
      }

      const [results] = await db.query(`
        SELECT 
          a.checkInSource,
          a.checkedInByType,
          COUNT(*) as count,
          COUNT(CASE WHEN a.facialVerified = 1 THEN 1 END) as facialVerified,
          COUNT(CASE WHEN a.isWithinGeofence = 1 THEN 1 END) as withinGeofence,
          AVG(a.distanceFromLocation) as avgDistance
        FROM attendances a
        ${whereClause}
        GROUP BY a.checkInSource, a.checkedInByType
        ORDER BY count DESC;
      `, params);

      res.json({
        success: true,
        data: {
          sourceStats: results,
          summary: {
            totalAttendances: results.reduce((sum, r) => sum + r.count, 0),
            bySelf: results.filter(r => r.checkInSource === 'self').reduce((sum, r) => sum + r.count, 0),
            byAdmin: results.filter(r => r.checkInSource === 'admin').reduce((sum, r) => sum + r.count, 0),
            bySupervisor: results.filter(r => r.checkInSource === 'supervisor').reduce((sum, r) => sum + r.count, 0)
          }
        }
      });

    } catch (error) {
      console.error('❌ SOURCE STATS ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul des statistiques'
      });
    }
  }
);

// Fonction utilitaire pour les messages de source
function getSourceMessage(attendance) {
  switch (attendance.checkInSource || attendance.checkedInByType) {
    case 'self':
      return `Pointage effectué par l'agent via son téléphone`;
    case 'admin':
      const adminName = attendance.checkedInByUser ? 
        `${attendance.checkedInByUser.firstName} ${attendance.checkedInByUser.lastName}` : 'Administrateur';
      return `Pointage effectué par l'administrateur ${adminName}`;
    case 'supervisor':
      const supervisorName = attendance.checkedInByUser ?
        `${attendance.checkedInByUser.firstName} ${attendance.checkedInByUser.lastName}` : 'Responsable';
      return `Pointage effectué par le responsable ${supervisorName}`;
    default:
      return 'Source de pointage inconnue';
  }
}

module.exports = router;