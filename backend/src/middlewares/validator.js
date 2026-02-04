const { validationResult, body, param, query } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('🔴 Validation errors on', req.method, req.path, ':', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// User validation rules
const userValidation = {
  create: [
    // employeeId est généré automatiquement par le contrôleur
    body('employeeId')
      .optional()
      .isLength({ max: 20 }).withMessage('L\'ID employé ne doit pas dépasser 20 caractères'),
    body('firstName')
      .notEmpty().withMessage('Le prénom est requis')
      .isLength({ max: 100 }).withMessage('Le prénom ne doit pas dépasser 100 caractères'),
    body('lastName')
      .notEmpty().withMessage('Le nom est requis')
      .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
    body('email')
      .notEmpty().withMessage('L\'email est requis')
      .isEmail().withMessage('Email invalide'),
    // Le mot de passe est optionnel - si non fourni, le CIN sera utilisé pour agents/superviseurs
    body('password')
      .optional()
      .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('phone')
      .optional(),
    body('cin')
      .optional()
      .isLength({ min: 4, max: 20 }).withMessage('Le CIN doit contenir entre 4 et 20 caractères'),
    body('role')
      .optional()
      .isIn(['agent', 'supervisor', 'admin']).withMessage('Rôle invalide')
  ],
  update: [
    body('firstName')
      .optional()
      .isLength({ max: 100 }).withMessage('Le prénom ne doit pas dépasser 100 caractères'),
    body('lastName')
      .optional()
      .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
    body('email')
      .optional()
      .isEmail().withMessage('Email invalide'),
    body('role')
      .optional()
      .isIn(['agent', 'supervisor', 'admin']).withMessage('Rôle invalide'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended']).withMessage('Statut invalide')
  ],
  login: [
    body('email')
      .notEmpty().withMessage('L\'email est requis')
      .isEmail().withMessage('Email invalide'),
    body('password')
      .notEmpty().withMessage('Le mot de passe est requis')
  ]
};

// Event validation rules
const eventValidation = {
  create: [
    body('name')
      .notEmpty().withMessage('Le nom de l\'événement est requis')
      .isLength({ max: 255 }).withMessage('Le nom ne doit pas dépasser 255 caractères'),
    body('location')
      .notEmpty().withMessage('La localisation est requise'),
    body('startDate')
      .notEmpty().withMessage('La date de début est requise')
      .isISO8601().withMessage('Format de date invalide'),
    body('endDate')
      .notEmpty().withMessage('La date de fin est requise')
      .isISO8601().withMessage('Format de date invalide'),
    body('checkInTime')
      .notEmpty().withMessage('L\'heure d\'arrivée est requise'),
    body('checkOutTime')
      .notEmpty().withMessage('L\'heure de départ est requise'),
    body('latitude')
      .optional()
      .isDecimal().withMessage('Latitude invalide'),
    body('longitude')
      .optional()
      .isDecimal().withMessage('Longitude invalide'),
    body('requiredAgents')
      .optional()
      .isInt({ min: 1 }).withMessage('Le nombre d\'agents doit être au moins 1')
  ],
  update: [
    body('name')
      .optional()
      .isLength({ max: 255 }).withMessage('Le nom ne doit pas dépasser 255 caractères'),
    body('startDate')
      .optional()
      .isISO8601().withMessage('Format de date invalide'),
    body('endDate')
      .optional()
      .isISO8601().withMessage('Format de date invalide'),
    body('status')
      .optional()
      .isIn(['draft', 'scheduled', 'active', 'completed', 'cancelled']).withMessage('Statut invalide')
  ]
};

// Assignment validation rules
const assignmentValidation = {
  create: [
    body('agentId')
      .notEmpty().withMessage('L\'ID de l\'agent est requis')
      .isString().withMessage('ID agent doit être une chaîne'),
    body('eventId')
      .notEmpty().withMessage('L\'ID de l\'événement est requis')
      .isString().withMessage('ID événement doit être une chaîne'),
    body('role')
      .optional()
      .isIn(['primary', 'backup', 'supervisor']).withMessage('Rôle invalide')
  ],
  update: [
    body('status')
      .optional()
      .isIn(['pending', 'confirmed', 'declined', 'cancelled']).withMessage('Statut invalide'),
    body('role')
      .optional()
      .isIn(['primary', 'backup', 'supervisor']).withMessage('Rôle invalide')
  ]
};

// Attendance validation rules
const attendanceValidation = {
  checkIn: [
    body('eventId')
      .notEmpty().withMessage('L\'ID de l\'événement est requis')
      .isUUID().withMessage('ID événement invalide'),
    body('latitude')
      .optional()
      .isDecimal().withMessage('Latitude invalide'),
    body('longitude')
      .optional()
      .isDecimal().withMessage('Longitude invalide'),
    body('checkInMethod')
      .optional()
      .isIn(['facial', 'manual', 'qrcode']).withMessage('Méthode de pointage invalide')
  ],
  checkOut: [
    body('latitude')
      .optional()
      .isDecimal().withMessage('Latitude invalide'),
    body('longitude')
      .optional()
      .isDecimal().withMessage('Longitude invalide')
  ]
};

// UUID parameter validation
const uuidParam = (paramName = 'id') => [
  param(paramName)
    .isUUID().withMessage('ID invalide')
];

// Pagination query validation
const paginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Numéro de page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limite invalide (1-100)'),
  query('sortBy')
    .optional()
    .isString().withMessage('Champ de tri invalide'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Ordre de tri invalide')
];

module.exports = {
  validate,
  userValidation,
  eventValidation,
  assignmentValidation,
  attendanceValidation,
  uuidParam,
  paginationQuery
};
