/**
 * Face Recognition Service
 * Uses CompreFace API for facial recognition (external service)
 * Falls back to basic image validation when CompreFace is not available
 */

const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

class FaceRecognitionService {
  constructor() {
    this.compreFaceUrl = process.env.COMPREFACE_URL || 'http://localhost:8000';
    this.apiKey = process.env.COMPREFACE_API_KEY || '';
    this.recognitionThreshold = parseFloat(process.env.FACE_RECOGNITION_THRESHOLD) || 0.85;
    this.isCompreFaceAvailable = false;
    this.faceDescriptorCache = new Map();
    this.stats = {
      totalVerifications: 0,
      successfulVerifications: 0,
      failedVerifications: 0,
      spoofAttempts: 0,
      avgProcessingTime: 0,
    };

    // Check CompreFace availability on startup
    this.checkCompreFaceStatus();
  }

  /**
   * Check if CompreFace is available
   */
  async checkCompreFaceStatus() {
    if (!this.apiKey || this.apiKey === 'your-api-key-here') {
      console.log('CompreFace API key not configured. Using fallback mode.');
      this.isCompreFaceAvailable = false;
      return false;
    }

    try {
      const response = await axios.get(`${this.compreFaceUrl}/api/v1/recognition/status`, {
        headers: { 'x-api-key': this.apiKey },
        timeout: 5000
      });
      this.isCompreFaceAvailable = response.status === 200;
      console.log(`CompreFace status: ${this.isCompreFaceAvailable ? 'Available' : 'Unavailable'}`);
      return this.isCompreFaceAvailable;
    } catch (error) {
      console.log('CompreFace not available. Using fallback mode.');
      this.isCompreFaceAvailable = false;
      return false;
    }
  }

  /**
   * Initialize service (compatibility method)
   */
  async initialize() {
    await this.checkCompreFaceStatus();
    return true;
  }

  /**
   * Convert base64 to buffer
   */
  base64ToBuffer(base64Image) {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * Generate a simple hash-based descriptor for fallback mode
   */
  generateFallbackDescriptor(imageBuffer) {
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    // Convert hash to array of numbers (simulating a face descriptor)
    const descriptor = [];
    for (let i = 0; i < hash.length; i += 2) {
      descriptor.push(parseInt(hash.substr(i, 2), 16) / 255);
    }
    return descriptor;
  }

  /**
   * Detect faces in an image
   */
  async detectFaces(imageInput) {
    const startTime = Date.now();

    try {
      const imageBuffer = typeof imageInput === 'string'
        ? this.base64ToBuffer(imageInput)
        : imageInput;

      if (this.isCompreFaceAvailable) {
        return await this.detectFacesCompreFace(imageBuffer, startTime);
      } else {
        return this.detectFacesFallback(imageBuffer, startTime);
      }
    } catch (error) {
      console.error('Face detection error:', error.message);
      return {
        success: false,
        error: error.message,
        faces: [],
        count: 0,
      };
    }
  }

  /**
   * Detect faces using CompreFace
   */
  async detectFacesCompreFace(imageBuffer, startTime) {
    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

      const response = await axios.post(
        `${this.compreFaceUrl}/api/v1/detection/detect`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'x-api-key': this.apiKey
          },
          timeout: 30000
        }
      );

      const processingTime = Date.now() - startTime;
      const faces = response.data.result || [];

      return {
        success: true,
        faces: faces.map((face, index) => ({
          id: index,
          box: face.box,
          score: face.box?.probability || 0.9,
          landmarks: face.landmarks || [],
          age: face.age?.high ? Math.round((face.age.low + face.age.high) / 2) : null,
          gender: face.gender?.value || null,
        })),
        count: faces.length,
        processingTime,
        source: 'compreface'
      };
    } catch (error) {
      console.error('CompreFace detection error:', error.message);
      // Fallback to basic detection
      return this.detectFacesFallback(imageBuffer, startTime);
    }
  }

  /**
   * Fallback face detection (basic validation)
   */
  detectFacesFallback(imageBuffer, startTime) {
    const processingTime = Date.now() - startTime;

    // Basic image validation
    const isValidImage = imageBuffer && imageBuffer.length > 1000;

    if (!isValidImage) {
      return {
        success: false,
        error: 'Invalid image data',
        faces: [],
        count: 0,
        source: 'fallback'
      };
    }

    // In fallback mode, we assume 1 face detected if image is valid
    // This is a simplified approach - real face detection requires CompreFace
    return {
      success: true,
      faces: [{
        id: 0,
        box: { x: 0, y: 0, width: 100, height: 100 },
        score: 0.85,
        landmarks: [],
        descriptor: this.generateFallbackDescriptor(imageBuffer)
      }],
      count: 1,
      processingTime,
      source: 'fallback',
      warning: 'Using fallback mode. Configure CompreFace for accurate face detection.'
    };
  }

  /**
   * Register a new face for a user
   */
  async registerFace(userId, images) {
    if (!Array.isArray(images) || images.length < 1) {
      return {
        success: false,
        error: 'At least 1 image required for registration',
      };
    }

    try {
      if (this.isCompreFaceAvailable) {
        return await this.registerFaceCompreFace(userId, images);
      } else {
        return this.registerFaceFallback(userId, images);
      }
    } catch (error) {
      console.error('Face registration error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Register face using CompreFace
   */
  async registerFaceCompreFace(userId, images) {
    const registeredImages = [];

    for (const image of images) {
      try {
        const imageBuffer = typeof image === 'string'
          ? this.base64ToBuffer(image)
          : image;

        const formData = new FormData();
        formData.append('file', imageBuffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

        await axios.post(
          `${this.compreFaceUrl}/api/v1/recognition/faces?subject=${encodeURIComponent(userId)}`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'x-api-key': this.apiKey
            },
            timeout: 30000
          }
        );

        registeredImages.push(true);
      } catch (error) {
        console.error(`Failed to register image for ${userId}:`, error.message);
      }
    }

    if (registeredImages.length === 0) {
      return {
        success: false,
        error: 'No images could be registered. Ensure images contain clear faces.',
      };
    }

    return {
      success: true,
      userId,
      registeredImages: registeredImages.length,
      source: 'compreface'
    };
  }

  /**
   * Fallback face registration
   */
  registerFaceFallback(userId, images) {
    const descriptors = [];

    for (const image of images) {
      const imageBuffer = typeof image === 'string'
        ? this.base64ToBuffer(image)
        : image;

      if (imageBuffer && imageBuffer.length > 1000) {
        descriptors.push(this.generateFallbackDescriptor(imageBuffer));
      }
    }

    if (descriptors.length === 0) {
      return {
        success: false,
        error: 'No valid images provided for registration',
      };
    }

    // Calculate average descriptor
    const avgDescriptor = this.calculateAverageDescriptor(descriptors);

    // Store in cache
    this.faceDescriptorCache.set(userId, {
      descriptor: avgDescriptor,
      registeredAt: new Date(),
      imageCount: descriptors.length,
    });

    return {
      success: true,
      userId,
      registeredImages: descriptors.length,
      source: 'fallback',
      warning: 'Using fallback mode. Configure CompreFace for accurate face recognition.'
    };
  }

  /**
   * Verify a face against registered user
   */
  async verifyFace(userId, image, options = {}) {
    const startTime = Date.now();
    this.stats.totalVerifications++;

    try {
      if (this.isCompreFaceAvailable) {
        return await this.verifyFaceCompreFace(userId, image, startTime);
      } else {
        return this.verifyFaceFallback(userId, image, startTime);
      }
    } catch (error) {
      console.error('Face verification error:', error.message);
      this.stats.failedVerifications++;
      return {
        success: false,
        verified: false,
        error: error.message,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Verify face using CompreFace
   */
  async verifyFaceCompreFace(userId, image, startTime) {
    try {
      const imageBuffer = typeof image === 'string'
        ? this.base64ToBuffer(image)
        : image;

      const formData = new FormData();
      formData.append('file', imageBuffer, { filename: 'verify.jpg', contentType: 'image/jpeg' });

      const response = await axios.post(
        `${this.compreFaceUrl}/api/v1/recognition/recognize`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'x-api-key': this.apiKey
          },
          timeout: 30000
        }
      );

      const processingTime = Date.now() - startTime;
      const results = response.data.result || [];

      // Find match for the user
      let verified = false;
      let confidence = 0;
      let matchedSubject = null;

      for (const face of results) {
        for (const subject of (face.subjects || [])) {
          if (subject.subject === userId && subject.similarity >= this.recognitionThreshold) {
            verified = true;
            confidence = Math.round(subject.similarity * 100);
            matchedSubject = subject;
            break;
          }
        }
        if (verified) break;
      }

      if (verified) {
        this.stats.successfulVerifications++;
      } else {
        this.stats.failedVerifications++;
      }

      this.updateAvgProcessingTime(processingTime);

      return {
        success: true,
        verified,
        confidence,
        threshold: Math.round(this.recognitionThreshold * 100),
        processingTime,
        source: 'compreface',
        details: matchedSubject
      };
    } catch (error) {
      // Fallback on error
      return this.verifyFaceFallback(userId, image, startTime);
    }
  }

  /**
   * Fallback face verification
   */
  verifyFaceFallback(userId, image, startTime) {
    const storedData = this.faceDescriptorCache.get(userId);

    if (!storedData) {
      return {
        success: false,
        verified: false,
        error: 'User face not registered',
        errorCode: 'NOT_REGISTERED',
      };
    }

    const imageBuffer = typeof image === 'string'
      ? this.base64ToBuffer(image)
      : image;

    if (!imageBuffer || imageBuffer.length < 1000) {
      this.stats.failedVerifications++;
      return {
        success: false,
        verified: false,
        error: 'Invalid image data',
        errorCode: 'INVALID_IMAGE',
      };
    }

    const inputDescriptor = this.generateFallbackDescriptor(imageBuffer);
    const distance = this.euclideanDistance(inputDescriptor, storedData.descriptor);

    // In fallback mode, we use a more lenient threshold
    const verified = distance < 0.5;
    const confidence = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));

    if (verified) {
      this.stats.successfulVerifications++;
    } else {
      this.stats.failedVerifications++;
    }

    const processingTime = Date.now() - startTime;
    this.updateAvgProcessingTime(processingTime);

    return {
      success: true,
      verified,
      confidence,
      distance,
      processingTime,
      source: 'fallback',
      warning: 'Using fallback mode. Results may not be accurate. Configure CompreFace for proper verification.'
    };
  }

  /**
   * Identify a face from all registered users
   */
  async identifyFace(image, options = {}) {
    const { maxResults = 5 } = options;

    try {
      if (this.isCompreFaceAvailable) {
        return await this.identifyFaceCompreFace(image, maxResults);
      } else {
        return this.identifyFaceFallback(image, maxResults);
      }
    } catch (error) {
      console.error('Face identification error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Identify face using CompreFace
   */
  async identifyFaceCompreFace(image, maxResults) {
    const imageBuffer = typeof image === 'string'
      ? this.base64ToBuffer(image)
      : image;

    const formData = new FormData();
    formData.append('file', imageBuffer, { filename: 'identify.jpg', contentType: 'image/jpeg' });

    const response = await axios.post(
      `${this.compreFaceUrl}/api/v1/recognition/recognize`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'x-api-key': this.apiKey
        },
        timeout: 30000
      }
    );

    const results = response.data.result || [];
    const matches = [];

    for (const face of results) {
      for (const subject of (face.subjects || [])) {
        if (subject.similarity >= this.recognitionThreshold) {
          matches.push({
            userId: subject.subject,
            confidence: Math.round(subject.similarity * 100),
            similarity: subject.similarity
          });
        }
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return {
      success: true,
      identified: matches.length > 0,
      matches: matches.slice(0, maxResults),
      source: 'compreface'
    };
  }

  /**
   * Fallback face identification
   */
  identifyFaceFallback(image, maxResults) {
    const imageBuffer = typeof image === 'string'
      ? this.base64ToBuffer(image)
      : image;

    const inputDescriptor = this.generateFallbackDescriptor(imageBuffer);
    const matches = [];

    for (const [userId, userData] of this.faceDescriptorCache) {
      const distance = this.euclideanDistance(inputDescriptor, userData.descriptor);
      const confidence = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));

      if (distance < 0.5) {
        matches.push({
          userId,
          distance,
          confidence
        });
      }
    }

    matches.sort((a, b) => b.confidence - a.confidence);

    return {
      success: true,
      identified: matches.length > 0,
      matches: matches.slice(0, maxResults),
      totalRegistered: this.faceDescriptorCache.size,
      source: 'fallback',
      warning: 'Using fallback mode. Results may not be accurate.'
    };
  }

  /**
   * Calculate Euclidean distance between descriptors
   */
  euclideanDistance(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2) return 1;
    if (descriptor1.length !== descriptor2.length) return 1;

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
      sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate average descriptor from multiple descriptors
   */
  calculateAverageDescriptor(descriptors) {
    if (!descriptors || descriptors.length === 0) return [];

    const length = descriptors[0].length;
    const avg = new Array(length).fill(0);

    for (const descriptor of descriptors) {
      for (let i = 0; i < length; i++) {
        avg[i] += descriptor[i];
      }
    }

    for (let i = 0; i < length; i++) {
      avg[i] /= descriptors.length;
    }

    return avg;
  }

  /**
   * Update average processing time
   */
  updateAvgProcessingTime(newTime) {
    const total = this.stats.totalVerifications;
    if (total > 0) {
      this.stats.avgProcessingTime =
        (this.stats.avgProcessingTime * (total - 1) + newTime) / total;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      registeredUsers: this.faceDescriptorCache.size,
      compreFaceAvailable: this.isCompreFaceAvailable,
      threshold: this.recognitionThreshold,
      successRate: this.stats.totalVerifications > 0
        ? Math.round((this.stats.successfulVerifications / this.stats.totalVerifications) * 100)
        : 0,
    };
  }

  /**
   * Delete face registration for a user
   */
  async deleteFaceRegistration(userId) {
    // Remove from local cache
    this.faceDescriptorCache.delete(userId);

    // Remove from CompreFace if available
    if (this.isCompreFaceAvailable) {
      try {
        await axios.delete(
          `${this.compreFaceUrl}/api/v1/recognition/faces?subject=${encodeURIComponent(userId)}`,
          {
            headers: { 'x-api-key': this.apiKey },
            timeout: 10000
          }
        );
      } catch (error) {
        console.error(`Failed to delete face from CompreFace for ${userId}:`, error.message);
      }
    }

    return { success: true, userId };
  }

  /**
   * Clear cache for a user
   */
  clearUserCache(userId) {
    return this.faceDescriptorCache.delete(userId);
  }

  /**
   * Export user face data for backup
   */
  exportUserData(userId) {
    const data = this.faceDescriptorCache.get(userId);
    if (!data) return null;

    return {
      userId,
      ...data,
      exportedAt: new Date(),
    };
  }

  /**
   * Import user face data from backup
   */
  importUserData(userId, data) {
    if (!data || !data.descriptor) {
      return false;
    }

    this.faceDescriptorCache.set(userId, {
      descriptor: data.descriptor,
      registeredAt: data.registeredAt || new Date(),
      imageCount: data.imageCount || 1,
      importedAt: new Date(),
    });

    return true;
  }

  /**
   * Export all face data
   */
  exportAllData() {
    const data = {};
    for (const [userId, userData] of this.faceDescriptorCache) {
      data[userId] = userData;
    }
    return {
      data,
      count: this.faceDescriptorCache.size,
      exportedAt: new Date(),
      version: '2.0',
    };
  }

  /**
   * Import all face data
   */
  importAllData(exportedData) {
    if (!exportedData || !exportedData.data) {
      return { success: false, error: 'Invalid data format' };
    }

    let imported = 0;
    for (const [userId, userData] of Object.entries(exportedData.data)) {
      if (this.importUserData(userId, userData)) {
        imported++;
      }
    }

    return {
      success: true,
      imported,
      total: Object.keys(exportedData.data).length,
    };
  }

  /**
   * Adjust recognition threshold
   */
  adjustThreshold(newThreshold) {
    if (newThreshold >= 0 && newThreshold <= 1) {
      this.recognitionThreshold = newThreshold;
      return { success: true, threshold: newThreshold };
    }
    return { success: false, error: 'Threshold must be between 0 and 1' };
  }

  /**
   * Get anomalies (stub for compatibility)
   */
  getAnomalies() {
    return {
      success: true,
      anomalies: [],
      spoofAttempts: this.stats.spoofAttempts
    };
  }
}

// Singleton instance
const faceRecognitionService = new FaceRecognitionService();

module.exports = faceRecognitionService;
