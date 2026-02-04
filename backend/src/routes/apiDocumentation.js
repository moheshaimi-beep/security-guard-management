const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { generateApiDocumentation, API_CATEGORIES } = require('../scripts/extractApiRoutes');

/**
 * GET /api/api-docs
 * Récupère la documentation complète de l'API
 */
router.get('/', authenticate, authorize('admin', 'supervisor'), async (req, res) => {
  try {
    const documentation = generateApiDocumentation();
    
    res.json({
      success: true,
      data: documentation
    });
  } catch (error) {
    console.error('Erreur lors de la génération de la documentation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération de la documentation API',
      error: error.message
    });
  }
});

/**
 * GET /api/api-docs/categories
 * Récupère uniquement les catégories disponibles
 */
router.get('/categories', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: API_CATEGORIES
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
      error: error.message
    });
  }
});

/**
 * GET /api/api-docs/export
 * Exporte la documentation en JSON
 */
router.get('/export', authenticate, authorize('admin'), async (req, res) => {
  try {
    const documentation = generateApiDocumentation();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="api-documentation-${Date.now()}.json"`);
    res.send(JSON.stringify(documentation, null, 2));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export de la documentation',
      error: error.message
    });
  }
});

/**
 * GET /api/api-docs/stats
 * Récupère les statistiques de l'API
 */
router.get('/stats', authenticate, authorize('admin', 'supervisor'), async (req, res) => {
  try {
    const documentation = generateApiDocumentation();
    
    const stats = {
      totalRoutes: documentation.totalRoutes,
      totalCategories: Object.keys(documentation.categories).length,
      routesByMethod: {},
      routesByAuth: {
        public: 0,
        authenticated: 0,
        adminOnly: 0
      },
      categoriesWithMostRoutes: []
    };

    // Calculer les statistiques
    Object.values(documentation.categories).forEach(category => {
      category.routes.forEach(route => {
        // Par méthode
        stats.routesByMethod[route.method] = (stats.routesByMethod[route.method] || 0) + 1;
        
        // Par authentification
        if (!route.requiresAuth) {
          stats.routesByAuth.public++;
        } else if (route.roles.includes('admin')) {
          stats.routesByAuth.adminOnly++;
        } else {
          stats.routesByAuth.authenticated++;
        }
      });
    });

    // Top catégories
    stats.categoriesWithMostRoutes = Object.entries(documentation.categories)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([key, cat]) => ({
        name: cat.name,
        count: cat.count,
        percentage: Math.round((cat.count / documentation.totalRoutes) * 100)
      }));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques',
      error: error.message
    });
  }
});

module.exports = router;
