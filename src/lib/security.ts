
export const getOrGenerateDeviceFingerprint = (): string => {
  try {
    // 1. Try to get permanent unique UUID token from persistent localStorage
    let token = localStorage.getItem('earnwise_registration_token');
    if (token) return token;

    // 2. Generate a canvas/hardware fingerprint as a reliable hardware-based indicator
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let canvasHash = '';
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

    const fingerprintParts = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      navigator.hardwareConcurrency || 'N/A',
      canvasHash || 'N/A'
    ];

    const finalFingerprint = 'FP_' + fingerprintParts.join('_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 100);
    return finalFingerprint;
  } catch (err) {
    console.error("Error generating fingerprint:", err);
    return 'FP_FALLBACK_' + Math.random().toString(36).substring(2, 15);
  }
};
