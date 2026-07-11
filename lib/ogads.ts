export interface OGAdsOffer {
  ad_id: string | number;
  name: string;
  description?: string;
  payout: string | number;
  picture?: string;
  icon_url?: string;
  link: string;
  countries?: string[];
  country?: string;
  platform?: string;
  platforms?: string[];
  device?: string;
  category?: string;
}

export interface FetchOffersParams {
  ip?: string;
  userAgent?: string;
  country?: string;
  device?: string;
  type?: string;
  max?: string;
  min?: string;
}

export interface NormalizedOffer {
  id: string;
  title: string;
  description: string;
  payout: number;
  imageUrl: string;
  link: string;
  countries: string[];
  devices: string[];
  category: string;
}

/**
 * Fetches real live offers from the OGAds Offer API.
 * Uses Authorization: Bearer <OGADS_API_KEY>
 * Passes client IP, User-Agent, and Country for precision geo-targeting.
 */
export async function fetchOGAdsOffers(params: FetchOffersParams): Promise<NormalizedOffer[]> {
  const apiKey = process.env.OGADS_API_KEY;
  if (!apiKey) {
    throw new Error('OGADS_API_KEY is not defined in server environment variables.');
  }

  // The official OGAds Offer API Endpoint
  const url = 'https://appsave.online/api/v2';

  // Construct query params matching OGAds specs
  const queryParams: Record<string, string> = {};
  if (params.ip) queryParams.ip = params.ip;
  if (params.userAgent) queryParams.user_agent = params.userAgent;
  if (params.country) queryParams.country = params.country;
  if (params.device) queryParams.device = params.device;
  if (params.type) queryParams.type = params.type;
  if (params.max) queryParams.max = params.max;
  if (params.min) queryParams.min = params.min;

  const queryString = new URLSearchParams(queryParams).toString();
  const requestUrl = queryString ? `${url}?${queryString}` : url;

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    // Keep it real-time on server request (cache: no-store in Next.js)
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OGAds API HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  
  // Support if "data" itself is an array, or has "offers" or "data" fields
  const rawOffers = Array.isArray(data) ? data : (data.offers || data.data || []);
  
  if (!Array.isArray(rawOffers)) {
    return [];
  }

  // Standardize the offer structures for frontend safety
  return rawOffers.map((offer: any) => {
    // Extract payouts
    let payoutNum = parseFloat(offer.payout) || 0;
    
    // Fallback images if not provided
    const defaultImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80';
    const imageUrl = offer.picture || offer.icon_url || offer.image || defaultImage;

    // Normalizing devices & platforms
    let devices: string[] = [];
    if (offer.platforms && Array.isArray(offer.platforms)) {
      devices = offer.platforms;
    } else if (offer.platform) {
      devices = [offer.platform];
    } else if (offer.device) {
      devices = [offer.device];
    } else {
      devices = ['All Devices'];
    }

    return {
      id: String(offer.ad_id || offer.id || Math.random()),
      title: offer.name || offer.title || 'Premium Earnwise Campaign',
      description: offer.description || 'Complete the campaign instructions fully to receive your Naira wallet reward.',
      payout: payoutNum,
      imageUrl,
      link: offer.link || '#',
      countries: offer.countries || (offer.country ? [offer.country] : ['Global']),
      devices: devices.map(d => d.toLowerCase()),
      category: offer.category || 'Incentive Task',
    };
  });
}
