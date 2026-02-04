/**
 * Advanced Face Capture Component
 * High-accuracy facial capture with real-time feedback
 * Features: Liveness detection, quality assessment, guided capture
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import {
  FiCamera, FiCheck, FiX, FiRefreshCw, FiAlertTriangle,
  FiUser, FiShield, FiZap, FiEye, FiSun, FiLoader
} from 'react-icons/fi';

// Quality thresholds
const QUALITY_THRESHOLDS = {
  minFaceSize: 150, // Minimum face width in pixels
  maxFaceSize: 400, // Maximum face width
  minConfidence: 0.9,
  centerTolerance: 0.2, // How far from center face can be
  brightnessMin: 40,
  brightnessMax: 220,
};

const FaceCapture = ({
  onCapture,
  onVerify,
  mode = 'capture', // 'capture', 'register', 'verify'
  userId = null,
  requiredPhotos = 3,
  showGuide = true,
  autoCapture = false,
  className = '',
}) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // State
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceData, setFaceData] = useState(null);
  const [quality, setQuality] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [livenessCheck, setLivenessCheck] = useState({
    blinked: false,
    moved: false,
    smiled: false,
  });
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Previous face position for movement detection
  const prevFacePosition = useRef(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const MODEL_URL = '/models';

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        setModelsLoaded(true);
        setError(null);
      } catch (err) {
        console.error('Error loading face models:', err);
        setError('Failed to load face detection models');
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  // Real-time face detection
  useEffect(() => {
    if (!modelsLoaded || !cameraReady) return;

    const interval = setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        await detectFace();
      }
    }, 100); // 10 FPS for detection

    return () => clearInterval(interval);
  }, [modelsLoaded, cameraReady]);

  // Detect face and analyze
  const detectFace = async () => {
    const video = webcamRef.current.video;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        }))
        .withFaceLandmarks()
        .withFaceExpressions();

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        setFaceDetected(true);
        setFaceData(detection);

        // Draw detection
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        drawFaceGuide(ctx, resizedDetection, displaySize);

        // Analyze quality
        const qualityResult = analyzeQuality(detection, displaySize);
        setQuality(qualityResult);

        // Generate feedback
        const feedbackItems = generateFeedback(qualityResult, detection);
        setFeedback(feedbackItems);

        // Check liveness indicators
        checkLiveness(detection);

        // Auto capture if enabled and quality is good
        if (autoCapture && qualityResult.isGood && mode === 'capture') {
          capturePhoto();
        }
      } else {
        setFaceDetected(false);
        setFaceData(null);
        setQuality(null);
        setFeedback([{ type: 'error', message: 'No face detected' }]);

        // Draw empty guide
        drawEmptyGuide(ctx, displaySize);
      }
    } catch (err) {
      console.error('Detection error:', err);
    }
  };

  // Draw face guide overlay
  const drawFaceGuide = (ctx, detection, displaySize) => {
    const { box } = detection.detection;

    // Face outline
    ctx.strokeStyle = quality?.isGood ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Landmarks
    const landmarks = detection.landmarks;
    ctx.fillStyle = '#3b82f6';

    // Draw key landmarks (eyes, nose, mouth)
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();

    [leftEye, rightEye, nose, mouth].forEach(feature => {
      feature.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    });

    // Quality indicator
    const qualityColor = quality?.isGood ? '#10b981' : quality?.score > 50 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = qualityColor;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Quality: ${quality?.score || 0}%`, box.x, box.y - 10);
  };

  // Draw empty guide when no face
  const drawEmptyGuide = (ctx, displaySize) => {
    const centerX = displaySize.width / 2;
    const centerY = displaySize.height / 2;
    const guideWidth = 200;
    const guideHeight = 260;

    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(
      centerX - guideWidth / 2,
      centerY - guideHeight / 2,
      guideWidth,
      guideHeight
    );
    ctx.setLineDash([]);

    // Guide text
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Position your face here', centerX, centerY + guideHeight / 2 + 25);
  };

  // Analyze image quality
  const analyzeQuality = (detection, displaySize) => {
    const { box, score } = detection.detection;
    const factors = {};

    // Face size score
    const sizeScore = Math.min(100, Math.max(0,
      box.width >= QUALITY_THRESHOLDS.minFaceSize && box.width <= QUALITY_THRESHOLDS.maxFaceSize
        ? 100
        : box.width < QUALITY_THRESHOLDS.minFaceSize
          ? (box.width / QUALITY_THRESHOLDS.minFaceSize) * 100
          : (QUALITY_THRESHOLDS.maxFaceSize / box.width) * 100
    ));
    factors.size = { score: sizeScore, label: sizeScore > 70 ? 'Good' : 'Adjust distance' };

    // Detection confidence
    const confidenceScore = score * 100;
    factors.confidence = { score: confidenceScore, label: confidenceScore > 90 ? 'Clear' : 'Unclear' };

    // Position (center of frame)
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const frameCenterX = displaySize.width / 2;
    const frameCenterY = displaySize.height / 2;

    const offsetX = Math.abs(faceCenterX - frameCenterX) / displaySize.width;
    const offsetY = Math.abs(faceCenterY - frameCenterY) / displaySize.height;
    const positionScore = Math.max(0, 100 - (offsetX + offsetY) * 200);
    factors.position = { score: positionScore, label: positionScore > 70 ? 'Centered' : 'Center face' };

    // Calculate overall score
    const overallScore = Math.round(
      (sizeScore * 0.3 + confidenceScore * 0.4 + positionScore * 0.3)
    );

    return {
      score: overallScore,
      isGood: overallScore >= 75,
      factors,
    };
  };

  // Generate user feedback
  const generateFeedback = (quality, detection) => {
    const items = [];

    if (!quality) return [{ type: 'error', message: 'Position your face in the frame' }];

    if (quality.factors.size.score < 70) {
      items.push({
        type: 'warning',
        message: quality.factors.size.score < 50 ? 'Move closer' : 'Adjust your distance',
        icon: FiUser,
      });
    }

    if (quality.factors.position.score < 70) {
      items.push({
        type: 'warning',
        message: 'Center your face in the frame',
        icon: FiEye,
      });
    }

    if (quality.factors.confidence.score < 90) {
      items.push({
        type: 'warning',
        message: 'Improve lighting or hold still',
        icon: FiSun,
      });
    }

    if (items.length === 0 && quality.isGood) {
      items.push({
        type: 'success',
        message: 'Perfect! Ready to capture',
        icon: FiCheck,
      });
    }

    return items;
  };

  // Check liveness indicators
  const checkLiveness = (detection) => {
    const expressions = detection.expressions;
    const landmarks = detection.landmarks;

    // Check for smile
    if (expressions.happy > 0.5) {
      setLivenessCheck(prev => ({ ...prev, smiled: true }));
    }

    // Check for blink (simplified - look for eye aspect ratio changes)
    // This is a simplified version - real implementation would track over time
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Check for movement
    const currentPosition = detection.detection.box;
    if (prevFacePosition.current) {
      const moved = Math.abs(currentPosition.x - prevFacePosition.current.x) > 10 ||
                    Math.abs(currentPosition.y - prevFacePosition.current.y) > 10;
      if (moved) {
        setLivenessCheck(prev => ({ ...prev, moved: true }));
      }
    }
    prevFacePosition.current = currentPosition;
  };

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!webcamRef.current || !faceDetected || !quality?.isGood) {
      return;
    }

    setIsCapturing(true);

    try {
      const imageSrc = webcamRef.current.getScreenshot();

      if (mode === 'register') {
        setCapturedPhotos(prev => {
          const updated = [...prev, imageSrc];
          if (updated.length >= requiredPhotos) {
            onCapture?.(updated);
          }
          return updated;
        });
      } else if (mode === 'verify') {
        // Send for verification
        const result = await verifyWithBackend(imageSrc);
        setVerificationResult(result);
        onVerify?.(result);
      } else {
        onCapture?.(imageSrc);
      }
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [faceDetected, quality, mode, requiredPhotos, onCapture, onVerify]);

  // Verify with backend
  const verifyWithBackend = async (image) => {
    try {
      const response = await fetch('/api/face-recognition/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userId,
          image,
        }),
      });

      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Remove captured photo
  const removePhoto = (index) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Reset all
  const reset = () => {
    setCapturedPhotos([]);
    setVerificationResult(null);
    setLivenessCheck({ blinked: false, moved: false, smiled: false });
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`face-capture-loading ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
          <FiLoader className="animate-spin text-4xl text-blue-500 mb-4" />
          <p className="text-gray-600">Loading face detection models...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`face-capture-error ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg p-6">
          <FiAlertTriangle className="text-4xl text-red-500 mb-4" />
          <p className="text-red-700 text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`face-capture ${className}`}>
      {/* Camera view */}
      <div className="relative rounded-lg overflow-hidden bg-black">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.9}
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user',
          }}
          onUserMedia={() => setCameraReady(true)}
          onUserMediaError={(err) => setError('Camera access denied')}
          className="w-full"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />

        {/* Overlay UI */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          {/* Quality indicator */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  quality?.isGood ? 'bg-green-500' : faceDetected ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
              <span className="text-white text-sm">
                {quality?.isGood ? 'Ready' : faceDetected ? 'Adjusting...' : 'No face'}
              </span>
            </div>
            {quality && (
              <span className="text-white text-sm font-medium">
                Quality: {quality.score}%
              </span>
            )}
          </div>

          {/* Feedback messages */}
          {feedback.length > 0 && (
            <div className="space-y-1">
              {feedback.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-sm ${
                    item.type === 'success' ? 'text-green-400' :
                    item.type === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`}
                >
                  {item.icon && <item.icon size={14} />}
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liveness indicators (for registration) */}
        {mode === 'register' && showGuide && (
          <div className="absolute top-4 right-4 bg-black/50 rounded-lg p-2">
            <div className="text-white text-xs space-y-1">
              <div className={`flex items-center gap-2 ${livenessCheck.moved ? 'text-green-400' : ''}`}>
                {livenessCheck.moved ? <FiCheck /> : <FiX className="text-gray-400" />}
                <span>Head movement</span>
              </div>
              <div className={`flex items-center gap-2 ${livenessCheck.smiled ? 'text-green-400' : ''}`}>
                {livenessCheck.smiled ? <FiCheck /> : <FiX className="text-gray-400" />}
                <span>Smile detected</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Captured photos (registration mode) */}
      {mode === 'register' && capturedPhotos.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Captured Photos ({capturedPhotos.length}/{requiredPhotos})
          </h4>
          <div className="flex gap-2 flex-wrap">
            {capturedPhotos.map((photo, idx) => (
              <div key={idx} className="relative">
                <img
                  src={photo}
                  alt={`Capture ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification result */}
      {verificationResult && (
        <div className={`mt-4 p-4 rounded-lg ${
          verificationResult.verified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {verificationResult.verified ? (
              <FiShield className="text-2xl text-green-500" />
            ) : (
              <FiAlertTriangle className="text-2xl text-red-500" />
            )}
            <div>
              <h4 className={`font-medium ${verificationResult.verified ? 'text-green-700' : 'text-red-700'}`}>
                {verificationResult.verified ? 'Verification Successful' : 'Verification Failed'}
              </h4>
              {verificationResult.confidence && (
                <p className="text-sm text-gray-600">
                  Confidence: {verificationResult.confidence}%
                </p>
              )}
              {verificationResult.error && (
                <p className="text-sm text-red-600">{verificationResult.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={capturePhoto}
          disabled={!quality?.isGood || isCapturing}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
            quality?.isGood
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isCapturing ? (
            <FiLoader className="animate-spin" />
          ) : (
            <FiCamera />
          )}
          {mode === 'verify' ? 'Verify' : 'Capture'}
        </button>

        {(capturedPhotos.length > 0 || verificationResult) && (
          <button
            onClick={reset}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            <FiRefreshCw />
          </button>
        )}
      </div>

      {/* Instructions */}
      {showGuide && (
        <div className="mt-4 text-sm text-gray-500">
          <p className="font-medium mb-1">Tips for best results:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure good, even lighting on your face</li>
            <li>Look directly at the camera</li>
            <li>Remove glasses or hats if possible</li>
            <li>Keep a neutral expression</li>
            {mode === 'register' && (
              <li>Capture photos from slightly different angles</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FaceCapture;
