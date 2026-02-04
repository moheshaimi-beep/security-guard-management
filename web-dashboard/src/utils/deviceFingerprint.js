/**
 * Utilitaires pour générer un fingerprint unique de l'appareil
 * Utilisé pour la vérification des appareils autorisés
 */

/**
 * Génère un fingerprint unique basé sur les caractéristiques de l'appareil
 * @returns {Promise<string>} Fingerprint unique
 */
export const getDeviceFingerprint = async () => {
  const components = [];

  // User Agent
  components.push(navigator.userAgent);

  // Langue
  components.push(navigator.language);

  // Fuseau horaire
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Résolution écran
  components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);

  // Plateforme
  components.push(navigator.platform);

  // Nombre de processeurs
  components.push(navigator.hardwareConcurrency || 'unknown');

  // Mémoire (si disponible)
  if (navigator.deviceMemory) {
    components.push(navigator.deviceMemory);
  }

  // WebGL Renderer (plus unique)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch (e) {
    // Ignorer les erreurs WebGL
  }

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('SecurityGuard', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Fingerprint', 4, 17);
    components.push(canvas.toDataURL());
  } catch (e) {
    // Ignorer les erreurs canvas
  }

  // Générer le hash
  const fingerprint = await hashString(components.join('|'));
  return fingerprint;
};

/**
 * Génère un hash SHA-256 d'une chaîne
 * @param {string} str
 * @returns {Promise<string>}
 */
const hashString = async (str) => {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Récupère les informations de l'appareil
 * @returns {Object} Informations de l'appareil
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;

  // Détecter le navigateur
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // Détecter l'OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone OS') || ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) os = 'iOS';

  // Détecter si mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return {
    browser,
    os,
    isMobile,
    userAgent: ua,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency || 'unknown',
    memory: navigator.deviceMemory || 'unknown',
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
  };
};

/**
 * Génère un nom lisible pour l'appareil
 * @returns {string}
 */
export const getDeviceName = () => {
  const info = getDeviceInfo();
  return `${info.browser} sur ${info.os}${info.isMobile ? ' (Mobile)' : ''}`;
};

export default {
  getDeviceFingerprint,
  getDeviceInfo,
  getDeviceName
};
