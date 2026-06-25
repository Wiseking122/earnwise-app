const rawApiUrl = (import.meta as any).env.VITE_API_URL || '';
const rawWsUrl = (import.meta as any).env.VITE_WS_URL || '';

// If the configured URL points to onrender.com, ignore it as we've migrated off Render
const isRenderUrl = (url: string) => url.includes('onrender.com') || url.includes('render');

const isDevPreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('run.app') || 
  window.location.hostname.includes('localhost') || 
  window.location.hostname.includes('127.0.0.1')
);

export const API_BASE_URL = isDevPreview 
  ? '' 
  : (isRenderUrl(rawApiUrl) ? '' : rawApiUrl);

export const WS_BASE_URL = isDevPreview || isRenderUrl(rawWsUrl) || !rawWsUrl
  ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/api/ws'
  : rawWsUrl;

// Helper to get absolute URL if needed, or relative if no base is set
export const getApiUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
};

