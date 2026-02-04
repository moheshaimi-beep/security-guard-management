import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  FiCamera, FiCheck, FiX, FiRefreshCw, FiUser, FiAlertCircle,
  FiLoader, FiShield, FiZap, FiEye, FiUserCheck, FiUserX,
  FiArrowUp, FiArrowDown, FiArrowLeft, FiArrowRight, FiSun, FiMove,
  FiUpload, FiImage
} from 'react-icons/fi';
import {
  loadModels,
  areModelsLoaded,
  detectFace,
  extractDescriptorFromVideo,
  extractDescriptorFromBase64,
  verifyFace,
  drawDetection,
  checkImageQuality,
  getDominantExpression
} from '../services/faceRecognition';

/**
 * Composant de vérification faciale avec guide live et capture automatique
 */
const FaceVerification = ({
  referenceDescriptor = null,
  referencePhoto = null,
  onVerificationComplete,
  onDescriptorCaptured,
  mode = 'verify',
  autoStart = false,
  showReferencePhoto = true,
  className = ''
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const autoCaptureTimeoutRef = useRef(null);
  const goodQualityStartRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [qualityInfo, setQualityInfo] = useState(null);
  const [expression, setExpression] = useState(null);

  // Guide live states
  const [liveGuide, setLiveGuide] = useState({
    message: 'Cliquez pour activer la camera',
    icon: FiCamera,
    color: 'blue',
    progress: 0
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const [stabilityScore, setStabilityScore] = useState(0);

  // Refs pour éviter les closures stale
  const isCapturingRef = useRef(false);
  const faceDetectedRef = useRef(false);

  // Position tracking for stability
  const lastPositionsRef = useRef([]);
  const STABILITY_SAMPLES = 8;
  const REQUIRED_STABILITY_TIME = 1500; // 1.5 seconds de bonne qualité avant capture auto

  // Charger les modeles au montage
  useEffect(() => {
    const initModels = async () => {
      setIsLoading(true);
      setLiveGuide({
        message: 'Chargement des modeles IA...',
        icon: FiLoader,
        color: 'blue',
        progress: 0
      });
      const loaded = await loadModels();
      setModelsLoaded(loaded);
      setIsLoading(false);
      if (!loaded) {
        setError('Impossible de charger les modeles de reconnaissance faciale');
        setLiveGuide({
          message: 'Erreur de chargement',
          icon: FiAlertCircle,
          color: 'red',
          progress: 0
        });
      } else {
        setLiveGuide({
          message: 'Pret ! Cliquez pour activer la camera',
          icon: FiCamera,
          color: 'blue',
          progress: 0
        });
      }
    };
    initModels();

    return () => {
      stopCamera();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }
    };
  }, []);

  // Demarrer automatiquement si demande
  useEffect(() => {
    if (autoStart && modelsLoaded) {
      startCamera();
    }
  }, [autoStart, modelsLoaded]);

  const startCamera = async () => {
    try {
      setError(null);
      setLiveGuide({
        message: 'Activation de la camera...',
        icon: FiLoader,
        color: 'blue',
        progress: 0
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setLiveGuide({
          message: 'Recherche de votre visage...',
          icon: FiEye,
          color: 'blue',
          progress: 0
        });
        startFaceDetection();
      }
    } catch (err) {
      console.error('Erreur camera:', err);
      setError('Impossible d\'acceder a la camera. Verifiez les permissions.');
      setLiveGuide({
        message: 'Acces camera refuse',
        icon: FiAlertCircle,
        color: 'red',
        progress: 0
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setFaceDetected(false);
    faceDetectedRef.current = false;
    setStabilityScore(0);
    setCaptureCountdown(0);
    goodQualityStartRef.current = null;
    lastPositionsRef.current = [];
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (autoCaptureTimeoutRef.current) {
      clearTimeout(autoCaptureTimeoutRef.current);
    }
  };

  // Analyser la position du visage et generer des instructions
  // Detecter les lunettes en analysant les landmarks des yeux
  const detectGlasses = useCallback((landmarks) => {
    if (!landmarks || !landmarks.positions) return false;

    const positions = landmarks.positions;
    // Points des yeux (36-41 oeil gauche, 42-47 oeil droit dans le modele 68 points)
    // Analyser la zone autour des yeux pour detecter des lunettes

    // Les lunettes creent souvent des ombres ou des reflets qui modifient
    // la distance entre certains points. On verifie si la zone des yeux
    // a une configuration typique de lunettes (espacement anormal)

    if (positions.length >= 48) {
      const leftEye = positions.slice(36, 42);
      const rightEye = positions.slice(42, 48);

      // Calculer la hauteur moyenne des yeux
      const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y);
      const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y);
      const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;

      // Calculer la largeur des yeux
      const leftEyeWidth = Math.abs(leftEye[3].x - leftEye[0].x);
      const rightEyeWidth = Math.abs(rightEye[3].x - rightEye[0].x);

      // Ratio hauteur/largeur - les lunettes tendent a modifier ce ratio
      const leftRatio = leftEyeHeight / leftEyeWidth;
      const rightRatio = rightEyeHeight / rightEyeWidth;

      // Si les yeux semblent tres petits (partiellement caches), possibles lunettes de soleil
      if (leftRatio < 0.15 || rightRatio < 0.15) {
        return true;
      }
    }

    return false;
  }, []);

  // Detecter casquette/chapeau en analysant la position du front
  const detectHat = useCallback((landmarks, box) => {
    if (!landmarks || !landmarks.positions || !box) return false;

    const positions = landmarks.positions;

    if (positions.length >= 27) {
      // Points du sourcil (17-26)
      const leftBrow = positions.slice(17, 22);
      const rightBrow = positions.slice(22, 27);

      // Point le plus haut des sourcils
      const highestBrowY = Math.min(
        ...leftBrow.map(p => p.y),
        ...rightBrow.map(p => p.y)
      );

      // Distance entre le haut du visage detecte et les sourcils
      const foreheadSpace = highestBrowY - box.y;
      const expectedForehead = box.height * 0.25; // Normalement ~25% de la hauteur

      // Si le front est trop petit, possible casquette/chapeau
      if (foreheadSpace < expectedForehead * 0.5) {
        return true;
      }
    }

    return false;
  }, []);

  const analyzePosition = useCallback((detection, videoWidth, videoHeight) => {
    if (!detection) return null;

    const box = detection.detection.box;
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const frameCenterX = videoWidth / 2;
    const frameCenterY = videoHeight / 2;

    const offsetX = faceCenterX - frameCenterX;
    const offsetY = faceCenterY - frameCenterY;
    const toleranceX = videoWidth * 0.15;
    const toleranceY = videoHeight * 0.15;

    const idealFaceWidth = videoWidth * 0.35;
    const idealFaceWidthMin = idealFaceWidth * 0.7;
    const idealFaceWidthMax = idealFaceWidth * 1.3;

    const issues = [];
    let primaryIssue = null;
    let hasAccessoryIssue = false;

    // VERIFICATION LUNETTES ET CASQUETTE (prioritaire)
    const hasGlasses = detectGlasses(detection.landmarks);
    const hasHat = detectHat(detection.landmarks, box);

    if (hasGlasses) {
      issues.push('lunettes');
      hasAccessoryIssue = true;
      primaryIssue = {
        message: 'Retirez vos lunettes',
        icon: FiAlertCircle,
        direction: 'glasses'
      };
    }

    if (hasHat) {
      issues.push('casquette');
      hasAccessoryIssue = true;
      if (!primaryIssue) primaryIssue = {
        message: 'Retirez votre casquette/chapeau',
        icon: FiAlertCircle,
        direction: 'hat'
      };
    }

    // Verifier la taille du visage (distance)
    if (box.width < idealFaceWidthMin) {
      issues.push('trop_loin');
      if (!primaryIssue) primaryIssue = {
        message: 'Rapprochez-vous de la camera',
        icon: FiArrowUp,
        direction: 'closer'
      };
    } else if (box.width > idealFaceWidthMax) {
      issues.push('trop_proche');
      if (!primaryIssue) primaryIssue = {
        message: 'Eloignez-vous de la camera',
        icon: FiArrowDown,
        direction: 'farther'
      };
    }

    // Verifier la position horizontale
    if (Math.abs(offsetX) > toleranceX) {
      if (offsetX > 0) {
        issues.push('trop_droite');
        if (!primaryIssue) primaryIssue = {
          message: 'Deplacez-vous vers la gauche',
          icon: FiArrowLeft,
          direction: 'left'
        };
      } else {
        issues.push('trop_gauche');
        if (!primaryIssue) primaryIssue = {
          message: 'Deplacez-vous vers la droite',
          icon: FiArrowRight,
          direction: 'right'
        };
      }
    }

    // Verifier la position verticale
    if (Math.abs(offsetY) > toleranceY) {
      if (offsetY > 0) {
        issues.push('trop_bas');
        if (!primaryIssue) primaryIssue = {
          message: 'Levez votre tete',
          icon: FiArrowUp,
          direction: 'up'
        };
      } else {
        issues.push('trop_haut');
        if (!primaryIssue) primaryIssue = {
          message: 'Baissez votre tete',
          icon: FiArrowDown,
          direction: 'down'
        };
      }
    }

    // Verifier l'eclairage (basee sur la confiance de detection)
    if (detection.confidence < 0.85) {
      issues.push('eclairage_faible');
      if (!primaryIssue) primaryIssue = {
        message: 'Ameliorez l\'eclairage',
        icon: FiSun,
        direction: 'light'
      };
    }

    // Calculer le score de qualite
    let qualityScore = 100;

    // Penalite severe pour lunettes ou casquette (bloquant)
    if (hasAccessoryIssue) {
      qualityScore -= 50;
    }

    if (box.width < idealFaceWidthMin) {
      qualityScore -= Math.min(30, (idealFaceWidthMin - box.width) / idealFaceWidthMin * 50);
    } else if (box.width > idealFaceWidthMax) {
      qualityScore -= Math.min(30, (box.width - idealFaceWidthMax) / idealFaceWidthMax * 50);
    }
    qualityScore -= Math.min(20, Math.abs(offsetX) / toleranceX * 20);
    qualityScore -= Math.min(20, Math.abs(offsetY) / toleranceY * 20);
    qualityScore -= Math.min(20, (1 - detection.confidence) * 50);

    const finalQualityScore = Math.max(0, Math.round(qualityScore));

    // Debug: afficher le score toutes les 30 frames
    if (Math.random() < 0.03) {
      console.log('Score qualité:', finalQualityScore, 'isOptimal:', finalQualityScore >= 80 && !hasAccessoryIssue, 'Accessory:', hasAccessoryIssue);
    }

    return {
      issues,
      primaryIssue,
      qualityScore: finalQualityScore,
      // Capture autorisée si qualité >= 80% ET pas de lunettes/casquette
      isOptimal: finalQualityScore >= 80 && !hasAccessoryIssue,
      hasGlasses,
      hasHat,
      position: { offsetX, offsetY },
      faceSize: box.width
    };
  }, [detectGlasses, detectHat]);

  // Calculer la stabilite du visage
  const calculateStability = useCallback((detection) => {
    if (!detection) {
      lastPositionsRef.current = [];
      return 0;
    }

    const box = detection.detection.box;
    const currentPos = { x: box.x, y: box.y, w: box.width };

    lastPositionsRef.current.push(currentPos);
    if (lastPositionsRef.current.length > STABILITY_SAMPLES) {
      lastPositionsRef.current.shift();
    }

    if (lastPositionsRef.current.length < 3) return 0;

    // Calculer la variance des positions
    const positions = lastPositionsRef.current;
    const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const avgY = positions.reduce((s, p) => s + p.y, 0) / positions.length;

    const variance = positions.reduce((s, p) => {
      return s + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2);
    }, 0) / positions.length;

    // Convertir en score de stabilite (0-100)
    const maxVariance = 500; // Seuil de variance max
    const stability = Math.max(0, 100 - (variance / maxVariance * 100));

    return Math.round(stability);
  }, []);

  const startFaceDetection = () => {
    console.log('Démarrage de la détection faciale...');
    let frameCount = 0;

    const detect = async () => {
      // Vérifier que la vidéo est prête - ARRÊTER si pas de vidéo
      if (!videoRef.current || !videoRef.current.srcObject || !modelsLoaded) {
        // Arrêter la boucle si la vidéo n'est plus disponible (capture effectuée ou caméra arrêtée)
        if (!videoRef.current?.srcObject) {
          console.log('Vidéo arrêtée, fin de la détection');
          return;
        }
        // Sinon attendre que les modèles soient chargés
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      // Attendre que la vidéo ait des dimensions valides
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      frameCount++;

      try {
        const detection = await detectFace(videoRef.current);

        // Log toutes les 30 frames pour déboguer
        if (frameCount % 30 === 0) {
          console.log('Frame', frameCount, '- Detection:', detection ? 'Visage trouvé' : 'Aucun visage');
        }
        const videoWidth = videoRef.current?.videoWidth || 640;
        const videoHeight = videoRef.current?.videoHeight || 480;

        if (detection) {
          setFaceDetected(true);
          faceDetectedRef.current = true;
          setCurrentDetection(detection);

          // Analyser la position et generer les instructions
          const positionAnalysis = analyzePosition(detection, videoWidth, videoHeight);
          const stability = calculateStability(detection);
          setStabilityScore(stability);

          // Verifier la qualite standard
          const quality = checkImageQuality(detection);
          setQualityInfo({
            ...quality,
            ...positionAnalysis
          });

          // Expression dominante
          const expr = getDominantExpression(detection.expressions);
          setExpression(expr);

          // Dessiner sur le canvas overlay
          if (overlayCanvasRef.current) {
            const canvas = overlayCanvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Dessiner le guide oval au centre
            drawOvalGuide(ctx, videoWidth, videoHeight, positionAnalysis?.isOptimal);

            // Dessiner le cadre de detection
            const isGood = positionAnalysis?.isOptimal && stability > 70;
            drawDetection(canvas, detection, {
              showBox: true,
              showLandmarks: false,
              boxColor: isGood ? '#10B981' : positionAnalysis?.qualityScore > 60 ? '#F59E0B' : '#EF4444'
            });

            // Dessiner les fleches directionnelles si necessaire
            if (positionAnalysis?.primaryIssue) {
              drawDirectionArrow(ctx, videoWidth, videoHeight, positionAnalysis.primaryIssue.direction);
            }
          }

          // Mettre a jour le guide live
          updateLiveGuide(positionAnalysis, stability, detection.confidence);

          // Gerer la capture automatique
          handleAutoCapture(positionAnalysis, stability);

        } else {
          setFaceDetected(false);
          faceDetectedRef.current = false;
          setCurrentDetection(null);
          setQualityInfo(null);
          setStabilityScore(0);
          goodQualityStartRef.current = null;
          setCaptureCountdown(0);

          setLiveGuide({
            message: 'Aucun visage detecte - Placez votre visage face a la camera',
            icon: FiUser,
            color: 'yellow',
            progress: 0
          });

          // Effacer le canvas mais garder le guide oval
          if (overlayCanvasRef.current) {
            const ctx = overlayCanvasRef.current.getContext('2d');
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;
            overlayCanvasRef.current.width = videoWidth;
            overlayCanvasRef.current.height = videoHeight;
            ctx.clearRect(0, 0, videoWidth, videoHeight);
            drawOvalGuide(ctx, videoWidth, videoHeight, false);
          }
        }
      } catch (err) {
        console.error('Erreur detection:', err);
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  // Dessiner un guide oval au centre
  const drawOvalGuide = (ctx, width, height, isOptimal) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width * 0.18;
    const radiusY = height * 0.28;

    ctx.strokeStyle = isOptimal ? '#10B981' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isOptimal ? 4 : 2;
    ctx.setLineDash(isOptimal ? [] : [10, 10]);

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.setLineDash([]);

    // Ajouter des coins de guidage
    const cornerSize = 20;
    ctx.strokeStyle = isOptimal ? '#10B981' : 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;

    // Coin haut-gauche
    ctx.beginPath();
    ctx.moveTo(centerX - radiusX, centerY - radiusY + cornerSize);
    ctx.lineTo(centerX - radiusX, centerY - radiusY);
    ctx.lineTo(centerX - radiusX + cornerSize, centerY - radiusY);
    ctx.stroke();

    // Coin haut-droit
    ctx.beginPath();
    ctx.moveTo(centerX + radiusX - cornerSize, centerY - radiusY);
    ctx.lineTo(centerX + radiusX, centerY - radiusY);
    ctx.lineTo(centerX + radiusX, centerY - radiusY + cornerSize);
    ctx.stroke();

    // Coin bas-gauche
    ctx.beginPath();
    ctx.moveTo(centerX - radiusX, centerY + radiusY - cornerSize);
    ctx.lineTo(centerX - radiusX, centerY + radiusY);
    ctx.lineTo(centerX - radiusX + cornerSize, centerY + radiusY);
    ctx.stroke();

    // Coin bas-droit
    ctx.beginPath();
    ctx.moveTo(centerX + radiusX - cornerSize, centerY + radiusY);
    ctx.lineTo(centerX + radiusX, centerY + radiusY);
    ctx.lineTo(centerX + radiusX, centerY + radiusY - cornerSize);
    ctx.stroke();
  };

  // Dessiner une fleche directionnelle
  const drawDirectionArrow = (ctx, width, height, direction) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const arrowSize = 40;
    const offset = Math.min(width, height) * 0.35;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    let x, y, rotation;

    switch (direction) {
      case 'left':
        x = offset;
        y = centerY;
        rotation = Math.PI;
        break;
      case 'right':
        x = width - offset;
        y = centerY;
        rotation = 0;
        break;
      case 'up':
      case 'closer':
        x = centerX;
        y = offset;
        rotation = -Math.PI / 2;
        break;
      case 'down':
      case 'farther':
        x = centerX;
        y = height - offset;
        rotation = Math.PI / 2;
        break;
      default:
        return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Dessiner la fleche
    ctx.beginPath();
    ctx.moveTo(arrowSize, 0);
    ctx.lineTo(-arrowSize / 2, -arrowSize / 2);
    ctx.lineTo(-arrowSize / 2, arrowSize / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Mettre a jour le guide live
  const updateLiveGuide = (positionAnalysis, stability, confidence) => {
    if (!positionAnalysis) return;

    const { isOptimal, primaryIssue, qualityScore, hasGlasses, hasHat } = positionAnalysis;

    // Message prioritaire pour lunettes/casquette (BLOQUANT)
    if (hasGlasses || hasHat) {
      let message = '';
      if (hasGlasses && hasHat) {
        message = 'Retirez vos lunettes et votre casquette';
      } else if (hasGlasses) {
        message = 'Retirez vos lunettes pour continuer';
      } else {
        message = 'Retirez votre casquette/chapeau';
      }

      setLiveGuide({
        message,
        icon: FiAlertCircle,
        color: 'red',
        progress: 0
      });
      return;
    }

    if (isOptimal && stability >= 60) {
      const timeHeld = goodQualityStartRef.current
        ? Date.now() - goodQualityStartRef.current
        : 0;
      const progress = Math.min(100, (timeHeld / REQUIRED_STABILITY_TIME) * 100);

      setLiveGuide({
        message: progress < 100
          ? 'Parfait ! Restez immobile...'
          : 'Capture en cours...',
        icon: FiCheck,
        color: 'green',
        progress
      });
    } else if (isOptimal && stability < 60) {
      setLiveGuide({
        message: 'Bonne position ! Stabilisez-vous...',
        icon: FiMove,
        color: 'yellow',
        progress: stability
      });
    } else if (primaryIssue) {
      setLiveGuide({
        message: primaryIssue.message,
        icon: primaryIssue.icon,
        color: qualityScore > 60 ? 'yellow' : 'red',
        progress: qualityScore
      });
    } else {
      setLiveGuide({
        message: 'Ajustez votre position',
        icon: FiEye,
        color: 'yellow',
        progress: qualityScore
      });
    }
  };

  // Gerer la capture automatique
  const handleAutoCapture = useCallback((positionAnalysis, stability) => {
    if (!positionAnalysis || isCapturingRef.current || capturedPhoto) return;

    // Capture si qualité >= 80% et stabilité >= 60%
    const isReadyForCapture = positionAnalysis.isOptimal && stability >= 60;

    // Debug
    if (Math.random() < 0.05) {
      console.log('AutoCapture check:', {
        isOptimal: positionAnalysis.isOptimal,
        stability,
        isReadyForCapture,
        qualityScore: positionAnalysis.qualityScore,
        timeHeld: goodQualityStartRef.current ? Date.now() - goodQualityStartRef.current : 0
      });
    }

    if (isReadyForCapture) {
      if (!goodQualityStartRef.current) {
        goodQualityStartRef.current = Date.now();
        console.log('Début du timer de capture automatique');
      }

      const timeHeld = Date.now() - goodQualityStartRef.current;
      const countdown = Math.ceil((REQUIRED_STABILITY_TIME - timeHeld) / 1000);
      setCaptureCountdown(Math.max(0, countdown));

      if (timeHeld >= REQUIRED_STABILITY_TIME) {
        // Declencher la capture automatique
        console.log('DÉCLENCHEMENT CAPTURE AUTOMATIQUE!');
        performAutoCapture();
      }
    } else {
      goodQualityStartRef.current = null;
      setCaptureCountdown(0);
    }
  }, [capturedPhoto]);

  // Effectuer la capture automatique
  const performAutoCapture = async () => {
    console.log('performAutoCapture appelé', {
      isCapturingRef: isCapturingRef.current,
      hasVideo: !!videoRef.current,
      faceDetectedRef: faceDetectedRef.current
    });

    if (isCapturingRef.current) {
      console.log('Capture déjà en cours, abandon');
      return;
    }
    if (!videoRef.current) {
      console.log('Pas de vidéo, abandon');
      return;
    }
    // Utiliser la ref au lieu de l'état pour éviter les closures stale
    if (!faceDetectedRef.current) {
      console.log('Pas de visage détecté (ref), abandon');
      return;
    }

    isCapturingRef.current = true;
    setIsCapturing(true);
    console.log('Début de la capture...');

    setLiveGuide({
      message: 'Capture en cours...',
      icon: FiZap,
      color: 'green',
      progress: 100
    });

    try {
      // Capturer l'image
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('Canvas non disponible');
        setIsCapturing(false);
        return;
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);

      const photoData = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Photo capturée, extraction du descripteur...');
      setCapturedPhoto(photoData);

      // Extraire le descripteur
      const result = await extractDescriptorFromVideo(videoRef.current);
      console.log('Résultat extraction:', result ? 'OK' : 'ECHEC');

      if (result?.descriptor) {
        setCapturedDescriptor(result.descriptor);

        // Callback pour la capture
        if (onDescriptorCaptured) {
          onDescriptorCaptured({
            descriptor: result.descriptor,
            photo: photoData,
            confidence: result.confidence
          });
        }

        // Si mode verification et reference disponible
        if (mode === 'verify' && referenceDescriptor) {
          const verification = verifyFace(result.descriptor, referenceDescriptor);
          setVerificationResult(verification);

          if (onVerificationComplete) {
            onVerificationComplete({
              ...verification,
              capturedPhoto: photoData,
              capturedDescriptor: result.descriptor
            });
          }
        }

        setLiveGuide({
          message: 'Capture reussie !',
          icon: FiCheck,
          color: 'green',
          progress: 100
        });

        stopCamera();
      } else {
        setError('Impossible d\'extraire les caracteristiques faciales');
        setLiveGuide({
          message: 'Echec - Reessayez',
          icon: FiAlertCircle,
          color: 'red',
          progress: 0
        });
        goodQualityStartRef.current = null;
      }
    } catch (err) {
      console.error('Erreur capture:', err);
      setError('Erreur lors de la capture');
      goodQualityStartRef.current = null;
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  // Gérer l'upload d'image
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPEG, PNG...)');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('L\'image est trop grande (max 10MB)');
      return;
    }

    setIsProcessingUpload(true);
    setError(null);
    setLiveGuide({
      message: 'Analyse de l\'image en cours...',
      icon: FiLoader,
      color: 'blue',
      progress: 50
    });

    try {
      // Convertir en base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result;
        setUploadedImage(base64Image);

        // Extraire le descripteur facial
        const result = await extractDescriptorFromBase64(base64Image);

        if (result?.descriptor) {
          setCapturedPhoto(base64Image);
          setCapturedDescriptor(result.descriptor);

          // Callback pour la capture
          if (onDescriptorCaptured) {
            onDescriptorCaptured({
              descriptor: result.descriptor,
              photo: base64Image,
              confidence: result.confidence
            });
          }

          // Si mode verification et reference disponible
          if (mode === 'verify' && referenceDescriptor) {
            const verification = verifyFace(result.descriptor, referenceDescriptor);
            setVerificationResult(verification);

            if (onVerificationComplete) {
              onVerificationComplete({
                ...verification,
                capturedPhoto: base64Image,
                capturedDescriptor: result.descriptor
              });
            }
          }

          setLiveGuide({
            message: 'Visage détecté avec succès !',
            icon: FiCheck,
            color: 'green',
            progress: 100
          });
        } else {
          setError('Aucun visage détecté dans l\'image. Veuillez utiliser une photo avec un visage clairement visible.');
          setUploadedImage(null);
          setLiveGuide({
            message: 'Aucun visage détecté',
            icon: FiAlertCircle,
            color: 'red',
            progress: 0
          });
        }

        setIsProcessingUpload(false);
      };

      reader.onerror = () => {
        setError('Erreur lors de la lecture de l\'image');
        setIsProcessingUpload(false);
        setLiveGuide({
          message: 'Erreur de lecture',
          icon: FiAlertCircle,
          color: 'red',
          progress: 0
        });
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erreur upload:', err);
      setError('Erreur lors du traitement de l\'image');
      setIsProcessingUpload(false);
    }

    // Reset input pour permettre de re-sélectionner le même fichier
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const reset = () => {
    setCapturedPhoto(null);
    setCapturedDescriptor(null);
    setVerificationResult(null);
    setError(null);
    setQualityInfo(null);
    setStabilityScore(0);
    setCaptureCountdown(0);
    setUploadedImage(null);
    goodQualityStartRef.current = null;
    lastPositionsRef.current = [];
    setLiveGuide({
      message: 'Pret ! Cliquez pour activer la camera',
      icon: FiCamera,
      color: 'blue',
      progress: 0
    });
  };

  const getGuideColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      yellow: 'bg-yellow-500 text-white',
      red: 'bg-red-500 text-white'
    };
    return colors[color] || colors.blue;
  };

  const getProgressBarColor = (color) => {
    const colors = {
      blue: 'bg-blue-400',
      green: 'bg-green-400',
      yellow: 'bg-yellow-400',
      red: 'bg-red-400'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary-50 to-purple-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <FiShield className="mr-2 text-primary-600" />
            {mode === 'capture' ? 'Capture du visage' : 'Verification faciale'}
          </h3>
          <div className="flex items-center gap-2">
            {modelsLoaded ? (
              <span className="flex items-center text-xs text-green-600">
                <FiCheck className="mr-1" size={12} />
                IA prete
              </span>
            ) : isLoading ? (
              <span className="flex items-center text-xs text-gray-500">
                <FiLoader className="mr-1 animate-spin" size={12} />
                Chargement...
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Zone principale */}
        <div className="space-y-4">
          {/* Guide Live - Toujours visible */}
          <div className={`rounded-xl p-4 ${getGuideColorClasses(liveGuide.color)} transition-all duration-300`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <liveGuide.icon className={`mr-3 ${liveGuide.icon === FiLoader ? 'animate-spin' : ''}`} size={24} />
                <div>
                  <p className="font-medium text-lg">{liveGuide.message}</p>
                  {captureCountdown > 0 && (
                    <p className="text-sm opacity-90">Capture dans {captureCountdown}s...</p>
                  )}
                </div>
              </div>
              {cameraActive && !capturedPhoto && (
                <div className="text-right">
                  <div className="text-2xl font-bold">{qualityInfo?.qualityScore || 0}%</div>
                  <div className="text-xs opacity-75">Qualite</div>
                </div>
              )}
            </div>
            {/* Barre de progression */}
            {liveGuide.progress > 0 && (
              <div className="mt-3 h-2 bg-black bg-opacity-20 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressBarColor(liveGuide.color)} transition-all duration-300`}
                  style={{ width: `${liveGuide.progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Camera / Photo capturee */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {/* Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!cameraActive || capturedPhoto ? 'hidden' : ''}`}
            />

            {/* Canvas overlay pour la detection */}
            <canvas
              ref={overlayCanvasRef}
              className={`absolute inset-0 w-full h-full ${!cameraActive || capturedPhoto ? 'hidden' : ''}`}
            />

            {/* Canvas pour capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Photo capturee */}
            {capturedPhoto && (
              <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
            )}

            {/* Placeholder si camera inactive */}
            {!cameraActive && !capturedPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center text-gray-400">
                  <FiCamera size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Camera inactive</p>
                  <p className="text-sm opacity-75 mt-2">Cliquez sur le bouton ci-dessous</p>
                </div>
              </div>
            )}

            {/* Indicateurs en overlay */}
            {cameraActive && !capturedPhoto && (
              <>
                {/* Badge de stabilite */}
                <div className="absolute top-3 right-3 bg-black bg-opacity-60 rounded-lg px-3 py-2">
                  <div className="flex items-center text-white text-sm">
                    <FiMove className="mr-2" />
                    <span>Stabilite: {stabilityScore}%</span>
                  </div>
                  <div className="mt-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${stabilityScore > 70 ? 'bg-green-400' : 'bg-yellow-400'}`}
                      style={{ width: `${stabilityScore}%` }}
                    />
                  </div>
                </div>

                {/* Countdown de capture */}
                {captureCountdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-24 rounded-full bg-green-500 bg-opacity-80 flex items-center justify-center animate-pulse">
                      <span className="text-5xl font-bold text-white">{captureCountdown}</span>
                    </div>
                  </div>
                )}

                {/* Expression */}
                {expression && (
                  <div className="absolute bottom-3 left-3 px-3 py-1 bg-black bg-opacity-60 rounded-lg text-xs text-white">
                    Expression: {expression.expression} ({Math.round(expression.score * 100)}%)
                  </div>
                )}
              </>
            )}

            {/* Badge capture reussie */}
            {capturedPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-green-500 rounded-full p-6">
                  <FiCheck className="text-white" size={48} />
                </div>
              </div>
            )}
          </div>

          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Boutons */}
          <div className="space-y-3">
            {!cameraActive && !capturedPhoto && (
              <>
                {/* Deux options: Camera ou Upload */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startCamera}
                    disabled={!modelsLoaded || isLoading || isProcessingUpload}
                    className="bg-gradient-to-r from-primary-500 to-primary-700 text-white py-4 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-800 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <FiCamera className="mr-2" size={20} />
                    Prendre une photo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!modelsLoaded || isLoading || isProcessingUpload}
                    className="bg-gradient-to-r from-purple-500 to-purple-700 text-white py-4 rounded-xl font-semibold hover:from-purple-600 hover:to-purple-800 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isProcessingUpload ? (
                      <FiLoader className="mr-2 animate-spin" size={20} />
                    ) : (
                      <FiUpload className="mr-2" size={20} />
                    )}
                    Importer une image
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Vous pouvez prendre une photo avec la caméra ou importer une image existante (JPEG, PNG)
                </p>
              </>
            )}

            {cameraActive && !capturedPhoto && (
              <button
                onClick={stopCamera}
                className="w-full bg-gray-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-gray-700 transition-all flex items-center justify-center"
              >
                <FiX className="mr-3" size={24} />
                Annuler
              </button>
            )}

            {capturedPhoto && (
              <button
                onClick={reset}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center"
              >
                <FiRefreshCw className="mr-3" size={24} />
                Recommencer
              </button>
            )}
          </div>

          {/* Resultat de verification */}
          {verificationResult && (
            <div className={`p-4 rounded-xl ${verificationResult.isMatch ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center">
                {verificationResult.isMatch ? (
                  <FiUserCheck className="text-green-500 mr-3" size={32} />
                ) : (
                  <FiUserX className="text-red-500 mr-3" size={32} />
                )}
                <div>
                  <h4 className={`font-bold text-lg ${verificationResult.isMatch ? 'text-green-700' : 'text-red-700'}`}>
                    {verificationResult.isMatch ? 'IDENTITE VERIFIEE' : 'NON RECONNU'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Confiance: {verificationResult.confidence}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mode capture - Info descripteur */}
          {mode === 'capture' && capturedDescriptor && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="flex items-center text-green-700">
                <FiCheck className="mr-3" size={24} />
                <div>
                  <h4 className="font-bold">Visage capture avec succes !</h4>
                  <p className="text-sm text-green-600">
                    {capturedDescriptor.length} points de reference extraits
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center border border-red-200">
              <FiAlertCircle className="mr-3 flex-shrink-0" size={24} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceVerification;
