import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Cache memory variable for fast sync retrieval
let cachedFingerprint: string | null = null;

// Initialize FingerprintJS and cache the result asynchronously in the background
const initFingerprintJS = async () => {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cachedFingerprint = result.visitorId;
    if (cachedFingerprint) {
      try {
        localStorage.setItem('earnwise_fpjs_id', cachedFingerprint);
      } catch (e) {
        // Storage disabled or restricted
      }
    }
  } catch (error) {
    console.warn("Background FingerprintJS loading failed:", error);
  }
};

// Fire the async background initialization immediately on module load
initFingerprintJS().catch(console.error);

// Sync-accessible fingerprint generator
export const getOrGenerateDeviceFingerprint = (): string => {
  // 1. Check in-memory cache first
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  // 2. Try to get cached visitor ID from localStorage
  try {
    const localFp = localStorage.getItem('earnwise_fpjs_id');
    if (localFp) {
      cachedFingerprint = localFp;
      return localFp;
    }
  } catch (e) {
    // Storage restricted
  }

  // 3. Try permanent unique registration token from localStorage
  try {
    const token = localStorage.getItem('earnwise_registration_token');
    if (token) return token;
  } catch (e) {
    console.warn("localStorage is not accessible:", e);
  }

  // 4. Fallback to our custom robust canvas/hardware fingerprint as a stable identifier
  let canvasHash = 'N/A';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("EarnwiseAntiFraud,1.0", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("EarnwiseAntiFraud,1.0", 4, 17);
      const b64 = canvas.toDataURL();
      let hash = 0;
      for (let i = 0; i < b64.length; i++) {
        hash = (hash << 5) - hash + b64.charCodeAt(i);
        hash |= 0;
      }
      canvasHash = String(Math.abs(hash));
    }
  } catch (canvasErr) {
    console.warn("Canvas drawing is restricted or blocked by browser privacy features:", canvasErr);
    canvasHash = 'BLOCKED';
  }

  // Combine robust browser & device hardware characteristics
  const fingerprintParts = [
    navigator.userAgent || 'UA_UNKNOWN',
    navigator.language || 'LANG_UNKNOWN',
    screen.colorDepth || 'DEPTH_UNKNOWN',
    (screen.width && screen.height) ? `${screen.width}x${screen.height}` : 'RES_UNKNOWN',
    navigator.hardwareConcurrency || 'CONCUR_UNKNOWN',
    canvasHash
  ];

  // Replace special characters to form a clean identifier
  const rawFingerprint = 'FP_' + fingerprintParts.join('_').replace(/[^a-zA-Z0-9_]/g, '');
  
  // Return the stable, non-randomized hardware identity limit to 100 chars
  const finalFingerprint = rawFingerprint.slice(0, 100);
  
  // Cache it for subsequent synchronous calls in the same session
  cachedFingerprint = finalFingerprint;
  return finalFingerprint;
};
