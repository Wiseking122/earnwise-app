export interface MonetagLink {
  id: string;
  url: string;
  trackingId: string;
  type: string;
  active: boolean;
  name: string;
}

export const MONETAG_LINKS: MonetagLink[] = [];

export function getActiveMonetagLinks(): MonetagLink[] {
  return MONETAG_LINKS.filter(link => link.active);
}

/**
 * Handles Monetag Link selection and rotation.
 * Supports exact index choice (number), matching trackingId/id (string),
 * sequential fallback using last stored index, or randomized distribution.
 */
export function getMonetagLink(
  strategy: 'random' | 'sequential' | number | string, 
  previousIndex?: number
): { link: MonetagLink; index: number } {
  const activeLinks = getActiveMonetagLinks();
  if (activeLinks.length === 0) {
    throw new Error("No active Monetag smartlinks configured.");
  }

  // 1. Index-based selection
  if (typeof strategy === 'number') {
    const idx = Math.abs(strategy) % activeLinks.length;
    return { link: activeLinks[idx], index: idx };
  }

  // 2. Specific matching ID / Tracking ID lookup
  if (typeof strategy === 'string' && strategy !== 'random' && strategy !== 'sequential') {
    const foundIdx = activeLinks.findIndex(link => link.id === strategy || link.trackingId === strategy);
    if (foundIdx !== -1) {
      return { link: activeLinks[foundIdx], index: foundIdx };
    }
  }

  // 3. Sequential rotation based on previous stored state
  if (strategy === 'sequential' && typeof previousIndex === 'number') {
    const nextIdx = (previousIndex + 1) % activeLinks.length;
    return { link: activeLinks[nextIdx], index: nextIdx };
  }

  // 4. Random / Default distribution
  const randIdx = Math.floor(Math.random() * activeLinks.length);
  return { link: activeLinks[randIdx], index: randIdx };
}

/**
 * Programmatically triggers the onclika push notification advertiser activation prompt (No-Op)
 */
export function triggerOnclikaPush() {
  // Completely removed Onclika integrations
}
