// Memory cache fallback for environments (like cross-origin iframes) where localStorage is blocked
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Web storage is restricted in this context (iframe/cookies). Falling back to memory:`, e);
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] Web storage is restricted in this context (iframe/cookies). Falling back to memory:`, e);
      memoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Web storage is restricted in this context (iframe/cookies). Falling back to memory:`, e);
      delete memoryStorage[key];
    }
  }
};
