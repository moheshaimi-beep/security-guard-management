/**
 * Service de reconnaissance faciale utilisant face-api.js
 * Permet de:
 * - Détecter les visages
 * - Extraire les descripteurs faciaux (vecteurs 128D)
 * - Comparer deux visages
 * - Vérifier l'identité
 */

import * as faceapi from 'face-api.js';

// Configuration
// Utiliser CDN par défaut, ou '/models' si modèles locaux
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const MATCH_THRESHOLD = 0.45; // Seuil de correspondance amélioré (0-1, plus bas = plus strict)
const MIN_CONFIDENCE = 0.8; // Confiance minimale de détection
const HIGH_CONFIDENCE_THRESHOLD = 0.35; // Seuil pour haute confiance

let modelsLoaded = false;
let isLoading = false;

/**
 * Charge les modèles de reconnaissance faciale
 * @returns {Promise<boolean>}
 */
export const loadModels = async () => {
  if (modelsLoaded) return true;
  if (isLoading) {
    // Attendre que le chargement en cours se termine
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return modelsLoaded;
  }

  isLoading = true;

  try {
    console.log('Chargement des modèles de reconnaissance faciale...');

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
    ]);

    modelsLoaded = true;
    console.log('Modèles chargés avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors du chargement des modèles:', error);
    return false;
  } finally {
    isLoading = false;
  }
};

/**
 * Vérifie si les modèles sont chargés
 * @returns {boolean}
 */
export const areModelsLoaded = () => modelsLoaded;

/**
 * Détecte un visage dans une image
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Source de l'image
 * @returns {Promise<{detection: Object, descriptor: Float32Array, expressions: Object}|null>}
 */
export const detectFace = async (input) => {
  if (!modelsLoaded) {
    const loaded = await loadModels();
    if (!loaded) {
      console.error('Modèles non chargés, impossible de détecter');
      return null;
    }
  }

  try {
    // Utiliser SSD MobileNet pour une meilleure détection (plus fiable que TinyFaceDetector)
    let detection = await faceapi
      .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor()
      .withFaceExpressions();

    // Fallback sur TinyFaceDetector si SSD ne trouve rien
    if (!detection) {
      detection = await faceapi
        .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withFaceExpressions();
    }

    if (!detection) {
      return null;
    }

    return {
      detection: detection.detection,
      landmarks: detection.landmarks,
      descriptor: detection.descriptor,
      expressions: detection.expressions,
      confidence: detection.detection.score
    };
  } catch (error) {
    console.error('Erreur lors de la détection du visage:', error);
    return null;
  }
};

/**
 * Détecte tous les visages dans une image
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Source de l'image
 * @returns {Promise<Array>}
 */
export const detectAllFaces = async (input) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    const detections = await faceapi
      .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions();

    return detections.map(d => ({
      detection: d.detection,
      landmarks: d.landmarks,
      descriptor: d.descriptor,
      expressions: d.expressions,
      confidence: d.detection.score
    }));
  } catch (error) {
    console.error('Erreur lors de la détection des visages:', error);
    return [];
  }
};

/**
 * Compare deux descripteurs faciaux
 * @param {Float32Array|number[]} descriptor1 - Premier descripteur
 * @param {Float32Array|number[]} descriptor2 - Deuxième descripteur
 * @returns {number} Distance euclidienne (0 = identique, >0.6 = différent)
 */
export const compareDescriptors = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return 1;

  const d1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
  const d2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2);

  return faceapi.euclideanDistance(d1, d2);
};

/**
 * Vérifie si deux visages correspondent
 * @param {Float32Array|number[]} descriptor1 - Premier descripteur
 * @param {Float32Array|number[]} descriptor2 - Deuxième descripteur
 * @param {number} threshold - Seuil de correspondance (défaut: 0.45)
 * @returns {{isMatch: boolean, distance: number, confidence: number, confidenceLevel: string}}
 */
export const verifyFace = (descriptor1, descriptor2, threshold = MATCH_THRESHOLD) => {
  const distance = compareDescriptors(descriptor1, descriptor2);
  const isMatch = distance < threshold;
  // Convertir la distance en pourcentage de confiance (inversé et ajusté)
  // Distance 0 = 100%, Distance 0.45 = ~55%, Distance 1 = 0%
  const confidence = Math.max(0, Math.min(100, (1 - distance / 1.2) * 100));

  // Niveau de confiance
  let confidenceLevel = 'low';
  if (distance < HIGH_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'high'; // Très sûr
  } else if (distance < MATCH_THRESHOLD) {
    confidenceLevel = 'medium'; // Accepté
  }

  return {
    isMatch,
    distance,
    confidence: Math.round(confidence),
    confidenceLevel,
    threshold
  };
};

/**
 * Extrait le descripteur facial d'une image base64
 * @param {string} base64Image - Image en base64
 * @returns {Promise<{descriptor: number[], confidence: number, expressions: Object}|null>}
 */
export const extractDescriptorFromBase64 = async (base64Image) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const result = await detectFace(img);
        if (result && result.descriptor) {
          resolve({
            descriptor: Array.from(result.descriptor),
            confidence: result.confidence,
            expressions: result.expressions
          });
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Erreur extraction descripteur:', error);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.error('Erreur chargement image');
      resolve(null);
    };

    img.src = base64Image;
  });
};

/**
 * Extrait le descripteur facial depuis un élément vidéo
 * @param {HTMLVideoElement} video - Élément vidéo
 * @returns {Promise<{descriptor: number[], confidence: number, boundingBox: Object}|null>}
 */
export const extractDescriptorFromVideo = async (video) => {
  try {
    const result = await detectFace(video);
    if (result && result.descriptor) {
      return {
        descriptor: Array.from(result.descriptor),
        confidence: result.confidence,
        expressions: result.expressions,
        boundingBox: result.detection.box
      };
    }
    return null;
  } catch (error) {
    console.error('Erreur extraction depuis vidéo:', error);
    return null;
  }
};

/**
 * Vérifie un visage contre un descripteur stocké
 * @param {HTMLVideoElement|HTMLImageElement|string} input - Source (video, image, ou base64)
 * @param {number[]} storedDescriptor - Descripteur stocké en base
 * @param {number} threshold - Seuil de correspondance
 * @returns {Promise<{isMatch: boolean, confidence: number, distance: number, faceDetected: boolean}>}
 */
export const verifyAgainstStored = async (input, storedDescriptor, threshold = MATCH_THRESHOLD) => {
  let currentDescriptor = null;

  if (typeof input === 'string') {
    // Base64 image
    const result = await extractDescriptorFromBase64(input);
    currentDescriptor = result?.descriptor;
  } else {
    // Video or Image element
    const result = await detectFace(input);
    currentDescriptor = result?.descriptor ? Array.from(result.descriptor) : null;
  }

  if (!currentDescriptor) {
    return {
      isMatch: false,
      confidence: 0,
      distance: 1,
      faceDetected: false,
      message: 'Aucun visage détecté'
    };
  }

  if (!storedDescriptor || !Array.isArray(storedDescriptor)) {
    return {
      isMatch: false,
      confidence: 0,
      distance: 1,
      faceDetected: true,
      message: 'Aucun descripteur de référence'
    };
  }

  const verification = verifyFace(currentDescriptor, storedDescriptor, threshold);

  return {
    ...verification,
    faceDetected: true,
    message: verification.isMatch ? 'Identité vérifiée' : 'Visage non reconnu'
  };
};

/**
 * Dessine les détections sur un canvas
 * @param {HTMLCanvasElement} canvas - Canvas de destination
 * @param {Object} detection - Résultat de détection
 * @param {Object} options - Options d'affichage
 */
export const drawDetection = (canvas, detection, options = {}) => {
  const {
    showBox = true,
    showLandmarks = false,
    showExpressions = false,
    boxColor = '#10B981',
    matchResult = null
  } = options;

  const ctx = canvas.getContext('2d');
  const { box } = detection.detection;

  // Couleur basée sur le résultat de la correspondance
  let color = boxColor;
  if (matchResult !== null) {
    color = matchResult ? '#10B981' : '#EF4444'; // Vert si match, rouge sinon
  }

  if (showBox) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Label de confiance
    ctx.fillStyle = color;
    ctx.font = '16px Arial';
    const confidence = Math.round(detection.confidence * 100);
    ctx.fillText(`${confidence}%`, box.x, box.y - 5);
  }

  if (showLandmarks && detection.landmarks) {
    faceapi.draw.drawFaceLandmarks(canvas, detection.landmarks);
  }

  if (showExpressions && detection.expressions) {
    const expressions = detection.expressions;
    const maxExpression = Object.entries(expressions).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );
    ctx.fillStyle = '#3B82F6';
    ctx.fillText(maxExpression[0], box.x, box.y + box.height + 20);
  }
};

/**
 * Obtient l'expression dominante
 * @param {Object} expressions - Object des expressions
 * @returns {{expression: string, score: number}}
 */
export const getDominantExpression = (expressions) => {
  if (!expressions) return { expression: 'unknown', score: 0 };

  const entries = Object.entries(expressions);
  const max = entries.reduce((a, b) => a[1] > b[1] ? a : b);

  return {
    expression: max[0],
    score: max[1]
  };
};

/**
 * Vérifie la qualité d'une image pour la reconnaissance faciale
 * @param {Object} detection - Résultat de détection
 * @returns {{isGoodQuality: boolean, issues: string[]}}
 */
export const checkImageQuality = (detection) => {
  const issues = [];

  if (!detection) {
    return { isGoodQuality: false, issues: ['Aucun visage détecté'] };
  }

  // Vérifier la confiance de détection
  if (detection.confidence < MIN_CONFIDENCE) {
    issues.push('Confiance de détection faible');
  }

  // Vérifier la taille du visage
  const box = detection.detection.box;
  if (box.width < 100 || box.height < 100) {
    issues.push('Visage trop petit - rapprochez-vous');
  }

  // Vérifier si le visage est bien centré (rough check)
  // Vous pouvez ajuster selon la taille de votre canvas/video

  return {
    isGoodQuality: issues.length === 0,
    issues,
    confidence: detection.confidence,
    faceSize: { width: box.width, height: box.height }
  };
};

export default {
  loadModels,
  areModelsLoaded,
  detectFace,
  detectAllFaces,
  compareDescriptors,
  verifyFace,
  extractDescriptorFromBase64,
  extractDescriptorFromVideo,
  verifyAgainstStored,
  drawDetection,
  getDominantExpression,
  checkImageQuality,
  MATCH_THRESHOLD,
  MIN_CONFIDENCE
};
