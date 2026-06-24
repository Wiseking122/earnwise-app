export interface MonetagLink {
  id: string;
  url: string;
  trackingId: string;
  type: string;
  active: boolean;
  name: string;
}

export const MONETAG_LINKS: MonetagLink[] = [
  { id: 'monetag-1', url: 'https://omg10.com/4/10926323', trackingId: 'OMG10_01', type: 'smartlink', active: true, name: 'Sponsor Stream 1' },
  { id: 'monetag-2', url: 'https://omg10.com/4/10946432', trackingId: 'OMG10_02', type: 'smartlink', active: true, name: 'Sponsor Stream 2' },
  { id: 'monetag-3', url: 'https://omg10.com/4/10926325', trackingId: 'OMG10_03', type: 'smartlink', active: true, name: 'Sponsor Stream 3' },
  { id: 'monetag-4', url: 'https://omg10.com/4/10926382', trackingId: 'OMG10_04', type: 'smartlink', active: true, name: 'Sponsor Stream 4' },
  { id: 'monetag-5', url: 'https://omg10.com/4/10926389', trackingId: 'OMG10_05', type: 'smartlink', active: true, name: 'Sponsor Stream 5' },
  { id: 'monetag-6', url: 'https://omg10.com/4/11098951', trackingId: 'OMG10_06', type: 'smartlink', active: true, name: 'Sponsor Stream 6' },
  { id: 'monetag-7', url: 'https://omg10.com/4/10928530', trackingId: 'OMG10_07', type: 'smartlink', active: true, name: 'Sponsor Stream 7' },
  { id: 'monetag-8', url: 'https://omg10.com/4/10926400', trackingId: 'OMG10_08', type: 'smartlink', active: true, name: 'Sponsor Stream 8' }
];

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
