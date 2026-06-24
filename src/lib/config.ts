export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '';
export const WS_BASE_URL = (import.meta as any).env.VITE_WS_URL || (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;

// Helper to get absolute URL if needed, or relative if no base is set
export const getApiUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
