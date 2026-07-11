import { NextRequest, NextResponse } from 'next/server';
import { fetchOGAdsOffers } from '../../../lib/ogads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Retrieve the visitor's authentic IP Address
    // Vercel routes supply client IP via 'x-forwarded-for' or 'x-real-ip'.
    const xForwardedFor = req.headers.get('x-forwarded-for');
    const ip = xForwardedFor
      ? xForwardedFor.split(',')[0].trim()
      : req.headers.get('x-real-ip') || 
        req.ip || 
        '';

    // 2. Retrieve User Agent to determine exact device targeting compatibility
    const userAgent = req.headers.get('user-agent') || '';

    // 3. Extract query parameters (for manual user filters or debug settings)
    const { searchParams } = new URL(req.url);
    const queryCountry = searchParams.get('country') || undefined;
    const queryDevice = searchParams.get('device') || undefined;

    // 4. Extract Geolocated country from Vercel edge headers (e.g., 'NG', 'US')
    const vercelCountry = req.headers.get('x-vercel-ip-country') || undefined;
    
    // Prioritize manual selector filter, then fallback to edge geolocation
    const country = queryCountry || vercelCountry;

    // 5. Fetch genuine offers from the server-side API handler
    const offers = await fetchOGAdsOffers({
      ip,
      userAgent,
      country,
      device: queryDevice,
    });

    // Return structured payload safely to client
    return NextResponse.json({
      success: true,
      count: offers.length,
      offers,
      meta: {
        detectedIp: ip || 'unknown',
        detectedCountry: country || 'unknown',
        deviceRequested: queryDevice || 'all',
      },
    });
  } catch (error: any) {
    console.error('[OGADS API ROUTE ERROR]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch campaigns from OGAds server.',
      },
      { status: 500 }
    );
  }
}
