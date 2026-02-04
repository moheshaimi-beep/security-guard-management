/**
 * Service de Detection Liveness
 * Verifie que l'utilisateur est une personne reelle et non une photo/video/ecran
 */

const { LivenessLog, FraudAttempt, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Configuration Liveness
const LIVENESS_CONFIG = {
  minFrames: 5,                    // Minimum de frames a analyser
  minConfidence: 0.8,              // Confidence minimale
  maxAttempts: 3,                  // Tentatives max avant blocage
  blockDurationMinutes: 15,        // Duree blocage apres echecs
  checks: {
    blinkDetection: true,          // Detection clignement
    headMovement: true,            // Mouvement tete
    mouthMovement: false,          // Mouvement bouche (optionnel)
    textureAnalysis: true,         // Analyse texture (anti-photo)
    depthAnalysis: false,          // Analyse profondeur (si dispo)
    screenReflection: true         // Detection reflet ecran
  }
};

class LivenessService {
  constructor() {
    this.activeSessions = new Map();
  }

  /**
   * Demarrer une session de verification liveness
   */
  async startSession(userId, checkType = 'facial') {
    const sessionId = uuidv4();

    // Verifier si l'utilisateur n'est pas bloque
    const blockStatus = await this.checkUserBlocked(userId);
    if (blockStatus.blocked) {
      return {
        success: false,
        error: 'user_blocked',
        blockedUntil: blockStatus.until,
        reason: blockStatus.reason
      };
    }

    // Generer les challenges
    const challenges = this.generateChallenges(checkType);

    // Stocker la session
    this.activeSessions.set(sessionId, {
      userId,
      checkType,
      challenges,
      startedAt: new Date(),
      framesReceived: 0,
      checksCompleted: [],
      status: 'pending'
    });

    // Expirer la session apres 2 minutes
    setTimeout(() => {
      this.expireSession(sessionId);
    }, 120000);

    return {
      success: true,
      sessionId,
      challenges,
      instructions: this.getInstructions(challenges),
      timeout: 120000
    };
  }

  /**
   * Generer les challenges de liveness selon le type
   */
  generateChallenges(checkType) {
    const challenges = [];

    if (checkType === 'facial' || checkType === 'combined') {
      // Challenge aleatoire pour eviter les replays
      const facialChallenges = [
        { type: 'blink', instruction: 'Clignez des yeux 2 fois', duration: 3000 },
        { type: 'turn_left', instruction: 'Tournez la tete vers la gauche', duration: 2000 },
        { type: 'turn_right', instruction: 'Tournez la tete vers la droite', duration: 2000 },
        { type: 'nod', instruction: 'Hochez la tete de haut en bas', duration: 2000 },
        { type: 'smile', instruction: 'Souriez naturellement', duration: 2000 }
      ];

      // Selectionner 2-3 challenges aleatoires
      const shuffled = facialChallenges.sort(() => 0.5 - Math.random());
      challenges.push(...shuffled.slice(0, 2 + Math.floor(Math.random() * 2)));
    }

    if (checkType === 'document' || checkType === 'combined') {
      challenges.push(
        { type: 'tilt_document', instruction: 'Inclinez legerement le document', duration: 3000 },
        { type: 'move_document', instruction: 'Deplacez lentement le document', duration: 2000 }
      );
    }

    return challenges;
  }

  /**
   * Obtenir les instructions pour l'utilisateur
   */
  getInstructions(challenges) {
    return {
      fr: challenges.map(c => c.instruction),
      general: [
        'Placez-vous face a la camera',
        'Assurez un bon eclairage',
        'Suivez les instructions a l\'ecran'
      ]
    };
  }

  /**
   * Verifier une frame de liveness
   */
  async verifyFrame(sessionId, frameData, metadata = {}) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'session_expired' };
    }

    session.framesReceived++;

    // Analyser la frame
    const analysis = await this.analyzeFrame(frameData, session, metadata);

    // Mettre a jour les checks completes
    if (analysis.checksCompleted) {
      session.checksCompleted.push(...analysis.checksCompleted);
    }

    // Detecter les anomalies
    if (analysis.anomalies && analysis.anomalies.length > 0) {
      await this.recordFraudAttempt(session.userId, analysis.anomalies, frameData, metadata);
    }

    return {
      success: true,
      progress: this.calculateProgress(session),
      feedback: analysis.feedback,
      currentChallenge: this.getCurrentChallenge(session)
    };
  }

  /**
   * Analyser une frame
   */
  async analyzeFrame(frameData, session, metadata) {
    const result = {
      checksCompleted: [],
      anomalies: [],
      feedback: null
    };

    // Analyse basique (a remplacer par vraie IA)
    // En production, utiliser CompreFace ou service similaire

    // Detection photo/ecran basique
    if (LIVENESS_CONFIG.checks.textureAnalysis) {
      const textureScore = this.analyzeTexture(frameData);
      if (textureScore < 0.5) {
        result.anomalies.push({
          type: 'photo_spoofing',
          confidence: 1 - textureScore,
          details: 'Texture suspecte detectee'
        });
      }
    }

    // Detection GPS Mock
    if (metadata.isMockLocation) {
      result.anomalies.push({
        type: 'gps_spoofing',
        confidence: 1,
        details: 'Location simulee detectee'
      });
    }

    // Simuler la detection des challenges
    // En production, utiliser face-api.js ou CompreFace
    const currentChallenge = this.getCurrentChallenge(session);
    if (currentChallenge && session.framesReceived >= LIVENESS_CONFIG.minFrames) {
      result.checksCompleted.push(currentChallenge.type);
      result.feedback = { message: 'Challenge complete!', type: 'success' };
    }

    return result;
  }

  /**
   * Analyse texture basique (placeholder)
   */
  analyzeTexture(frameData) {
    // En production, utiliser un vrai algorithme d'analyse
    // Retourne un score entre 0 (photo) et 1 (reel)
    return 0.9; // Placeholder
  }

  /**
   * Obtenir le challenge actuel
   */
  getCurrentChallenge(session) {
    const completedTypes = new Set(session.checksCompleted);
    return session.challenges.find(c => !completedTypes.has(c.type));
  }

  /**
   * Calculer la progression
   */
  calculateProgress(session) {
    const total = session.challenges.length;
    const completed = session.checksCompleted.length;
    return {
      percentage: Math.round((completed / total) * 100),
      completed,
      total
    };
  }

  /**
   * Finaliser la verification
   */
  async completeVerification(sessionId, finalFrameData) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'session_expired' };
    }

    const progress = this.calculateProgress(session);
    const allChallengesCompleted = progress.completed >= session.challenges.length;
    const hasEnoughFrames = session.framesReceived >= LIVENESS_CONFIG.minFrames;

    // Calculer le score de confiance
    const confidenceScore = this.calculateConfidence(session);

    // Determiner le resultat
    let result = 'failed';
    if (allChallengesCompleted && hasEnoughFrames && confidenceScore >= LIVENESS_CONFIG.minConfidence) {
      result = 'passed';
    } else if (confidenceScore >= 0.5) {
      result = 'inconclusive';
    }

    // Enregistrer le log
    const livenessLog = await LivenessLog.create({
      userId: session.userId,
      checkType: session.checkType,
      sessionId,
      result,
      confidenceScore,
      checksPerformed: session.challenges.map(c => c.type),
      failureReasons: result !== 'passed' ? this.getFailureReasons(session, confidenceScore) : null,
      framesAnalyzed: session.framesReceived,
      durationMs: Date.now() - session.startedAt.getTime()
    });

    // Mettre a jour l'utilisateur
    if (result === 'passed') {
      await User.update(
        { lastLivenessCheck: new Date() },
        { where: { id: session.userId } }
      );
    }

    // Nettoyer la session
    this.activeSessions.delete(sessionId);

    return {
      success: result === 'passed',
      result,
      confidenceScore,
      livenessLogId: livenessLog.id,
      canRetry: result !== 'passed'
    };
  }

  /**
   * Calculer le score de confiance
   */
  calculateConfidence(session) {
    const factors = [];

    // Nombre de challenges completes
    const challengeRatio = session.checksCompleted.length / session.challenges.length;
    factors.push(challengeRatio);

    // Nombre de frames
    const frameRatio = Math.min(session.framesReceived / (LIVENESS_CONFIG.minFrames * 2), 1);
    factors.push(frameRatio);

    // Temps de session (trop rapide = suspect)
    const duration = Date.now() - session.startedAt.getTime();
    const expectedDuration = session.challenges.reduce((sum, c) => sum + c.duration, 0);
    const timeRatio = Math.min(duration / expectedDuration, 1);
    factors.push(timeRatio > 0.5 ? 1 : timeRatio * 2);

    // Moyenne ponderee
    return factors.reduce((sum, f) => sum + f, 0) / factors.length;
  }

  /**
   * Obtenir les raisons d'echec
   */
  getFailureReasons(session, confidenceScore) {
    const reasons = [];

    if (session.checksCompleted.length < session.challenges.length) {
      reasons.push('Tous les challenges n\'ont pas ete completes');
    }

    if (session.framesReceived < LIVENESS_CONFIG.minFrames) {
      reasons.push('Nombre insuffisant de frames analysees');
    }

    if (confidenceScore < LIVENESS_CONFIG.minConfidence) {
      reasons.push('Score de confiance insuffisant');
    }

    return reasons;
  }

  /**
   * Expirer une session
   */
  expireSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status === 'pending') {
      this.activeSessions.delete(sessionId);

      // Enregistrer comme timeout
      LivenessLog.create({
        userId: session.userId,
        checkType: session.checkType,
        sessionId,
        result: 'timeout',
        framesAnalyzed: session.framesReceived,
        durationMs: 120000
      });
    }
  }

  /**
   * Verifier si l'utilisateur est bloque
   */
  async checkUserBlocked(userId) {
    return FraudAttempt.isUserBlocked(userId);
  }

  /**
   * Enregistrer une tentative de fraude
   */
  async recordFraudAttempt(userId, anomalies, frameData, metadata) {
    for (const anomaly of anomalies) {
      await FraudAttempt.record({
        userId,
        attemptType: anomaly.type,
        severity: anomaly.confidence > 0.8 ? 'high' : 'medium',
        description: anomaly.details,
        details: {
          confidence: anomaly.confidence,
          metadata
        },
        evidencePhoto: anomaly.type.includes('spoofing') ? frameData : null,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        deviceFingerprint: metadata.deviceFingerprint,
        ipAddress: metadata.ipAddress
      });
    }
  }
}

module.exports = new LivenessService();
