const rawApiUrl = (import.meta as any).env.VITE_API_URL || '';
const rawWsUrl = (import.meta as any).env.VITE_WS_URL || '';

// If the configured URL points to onrender.com, ignore it as we've migrated off Render
const isRenderUrl = (url: string) => url.includes('onrender.com') || url.includes('render');

// Since we are running in a full-stack container on Cloud Run/Custom Domains, 
// the API and WebSockets are hosted on the exact same domain.
// We default to relative paths/local origin so everything works automatically out-of-the-box.
export const API_BASE_URL = '';

export const WS_BASE_URL = (rawWsUrl && !isRenderUrl(rawWsUrl))
  ? rawWsUrl
  : (typeof window !== 'undefined' 
      ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/api/ws'
      : '');

// Helper to get absolute URL if needed, or relative if no base is set
export const getApiUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
};

