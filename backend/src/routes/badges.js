const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { sendNotification } = require('../services/socketService');

// Get all badges
router.get('/', authenticate, async (req, res) => {
  try {
    const { Badge } = require('../models');

    const badges = await Badge.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['points', 'DESC']]
    });

    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Get user badges
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { UserBadge, Badge, User } = require('../models');

    const userBadges = await UserBadge.findAll({
      where: { userId: req.params.userId },
      include: [
        {
          model: Badge,
          as: 'badge'
        },
        {
          model: User,
          as: 'awarder',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['awardedAt', 'DESC']]
    });

    res.json({ success: true, data: userBadges });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Get my badges
router.get('/my', authenticate, async (req, res) => {
  try {
    const { UserBadge, Badge } = require('../models');

    const userBadges = await UserBadge.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Badge,
        as: 'badge'
      }],
      order: [['awardedAt', 'DESC']]
    });

    const totalPoints = userBadges.reduce((sum, ub) => sum + (ub.badge?.points || 0), 0);

    res.json({
      success: true,
      data: {
        badges: userBadges,
        totalPoints,
        count: userBadges.length
      }
    });
  } catch (error) {
    console.error('Error fetching my badges:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Create badge (admin only)
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { Badge } = require('../models');

    const badge = await Badge.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Badge créé avec succès',
      data: badge
    });
  } catch (error) {
    console.error('Error creating badge:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Award badge to user
router.post('/award', authenticate, authorize(['admin', 'supervisor']), async (req, res) => {
  try {
    const { UserBadge, Badge, User, ActivityLog } = require('../models');
    const { userId, badgeId, reason } = req.body;

    // Check if badge exists
    const badge = await Badge.findByPk(badgeId);
    if (!badge) {
      return res.status(404).json({ success: false, message: 'Badge non trouvé' });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Check if already awarded
    const existing = await UserBadge.findOne({
      where: { userId, badgeId }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Ce badge a déjà été attribué à cet utilisateur'
      });
    }

    // Award badge
    const userBadge = await UserBadge.create({
      userId,
      badgeId,
      awardedBy: req.user.id,
      reason
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'BADGE_AWARDED',
      resourceType: 'badge',
      resourceId: badgeId,
      details: {
        recipientId: userId,
        recipientName: `${user.firstName} ${user.lastName}`,
        badgeName: badge.name
      }
    });

    // Send notification to user
    sendNotification(userId, {
      type: 'badge_awarded',
      title: 'Nouveau badge obtenu !',
      message: `Vous avez reçu le badge "${badge.name}"`,
      data: {
        badgeId,
        badgeName: badge.name,
        badgeIcon: badge.icon,
        points: badge.points
      }
    });

    res.status(201).json({
      success: true,
      message: `Badge "${badge.name}" attribué avec succès`,
      data: userBadge
    });
  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Remove badge from user
router.delete('/revoke/:userId/:badgeId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { UserBadge } = require('../models');
    const { userId, badgeId } = req.params;

    const userBadge = await UserBadge.findOne({
      where: { userId, badgeId }
    });

    if (!userBadge) {
      return res.status(404).json({ success: false, message: 'Badge non trouvé pour cet utilisateur' });
    }

    await userBadge.destroy();

    res.json({
      success: true,
      message: 'Badge retiré avec succès'
    });
  } catch (error) {
    console.error('Error revoking badge:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Get leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const { UserBadge, Badge, User } = require('../models');
    const sequelize = require('../models').sequelize;

    const leaderboard = await User.findAll({
      where: { role: 'agent', status: 'active' },
      attributes: [
        'id', 'firstName', 'lastName', 'employeeId', 'profilePhoto',
        [
          sequelize.literal(`(
            SELECT COALESCE(SUM(b.points), 0)
            FROM user_badges ub
            JOIN badges b ON ub.badgeId = b.id
            WHERE ub.userId = User.id
          )`),
          'totalPoints'
        ],
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM user_badges ub
            WHERE ub.userId = User.id
          )`),
          'badgeCount'
        ]
      ],
      order: [[sequelize.literal('totalPoints'), 'DESC']],
      limit: 50
    });

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Seed default badges
router.post('/seed', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { Badge } = require('../models');

    const defaultBadges = [
      // Performance badges
      { name: 'Étoile du mois', description: 'Meilleur agent du mois', icon: '⭐', color: '#FFD700', category: 'performance', points: 100 },
      { name: 'Top Performer', description: 'Score global supérieur à 90', icon: '🏆', color: '#FFD700', category: 'performance', points: 50 },
      { name: 'Expert', description: 'Score global supérieur à 80 pendant 3 mois', icon: '🎯', color: '#10B981', category: 'performance', points: 75 },

      // Attendance badges
      { name: 'Ponctualité parfaite', description: 'Aucun retard pendant 1 mois', icon: '⏰', color: '#3B82F6', category: 'attendance', points: 30 },
      { name: 'Présence exemplaire', description: '100% de présence pendant 3 mois', icon: '📅', color: '#8B5CF6', category: 'attendance', points: 50 },
      { name: 'Early Bird', description: 'Arrivée en avance 10 fois', icon: '🌅', color: '#F59E0B', category: 'attendance', points: 20 },

      // Experience badges
      { name: 'Vétéran', description: '5 ans d\'ancienneté', icon: '🎖️', color: '#6366F1', category: 'experience', points: 100 },
      { name: 'Senior', description: '2 ans d\'ancienneté', icon: '🏅', color: '#EC4899', category: 'experience', points: 50 },
      { name: 'Confirmé', description: '1 an d\'ancienneté', icon: '✅', color: '#14B8A6', category: 'experience', points: 25 },

      // Special badges
      { name: 'Héros', description: 'Action héroïque lors d\'un incident', icon: '🦸', color: '#EF4444', category: 'special', points: 200 },
      { name: 'Mentor', description: 'Formation de nouveaux agents', icon: '👨‍🏫', color: '#06B6D4', category: 'special', points: 40 },
      { name: 'Polyvalent', description: 'Travail sur 5 types d\'événements différents', icon: '🔄', color: '#84CC16', category: 'special', points: 35 },

      // Training badges
      { name: 'SSIAP', description: 'Certification SSIAP obtenue', icon: '🔥', color: '#DC2626', category: 'training', points: 60 },
      { name: 'Secouriste', description: 'Formation premiers secours', icon: '🏥', color: '#059669', category: 'training', points: 40 },
      { name: 'Cynophile', description: 'Certification maître-chien', icon: '🐕', color: '#7C3AED', category: 'training', points: 60 }
    ];

    for (const badge of defaultBadges) {
      await Badge.findOrCreate({
        where: { name: badge.name },
        defaults: badge
      });
    }

    res.json({
      success: true,
      message: `${defaultBadges.length} badges créés/vérifiés`
    });
  } catch (error) {
    console.error('Error seeding badges:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
