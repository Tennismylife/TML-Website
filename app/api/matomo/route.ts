/**
 * Server-side Matomo tracking endpoint
 * - Accepts POST with JSON body containing: pageUrl, pageTitle, userAgent, ip
 * - Falls back to headers (Referer, User-Agent, X-Forwarded-For, X-Original-IP)
 * - Sends POST to Matomo HTTP Tracking API: idsite=1, rec=1, apiv=1
 * - Sets `ua` and `cip` where possible
 * - Always returns HTTP 204 (never surface errors to clients)
 * - Uses server-side fetch so it works even when client-side tracking is blocked
 */

import { NextRequest } from 'next/server';

const MATOMO_ENDPOINT = 'https://stats.tennismylife.org/matomo-tracking/matomo.php';
const TIMEOUT_MS = 2500;

// Funzione che invia i dati a Matomo
async function sendToMatomo({
  pageUrl,
  pageTitle,
  ua,
  ip,
  referer,
}: {
  pageUrl?: string | null;
  pageTitle?: string | null;
  ua?: string | null;
  ip?: string | null;
  referer?: string | null;
}) {
  try {
    const params = new URLSearchParams();
    params.set('idsite', '1');
    params.set('rec', '1');
    params.set('apiv', '1');
    if (pageUrl) params.set('url', String(pageUrl));
    if (pageTitle) params.set('action_name', String(pageTitle));
    if (ip) params.set('cip', String(ip));
    if (ua) params.set('ua', String(ua));
    if (referer) params.set('urlref', String(referer));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    await fetch(MATOMO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': ua || '',
      },
      body: params.toString(),
      signal: controller.signal,
    }).catch((e) => {
      console.warn('Matomo send failed:', e?.message || e);
    });

    clearTimeout(timeout);
  } catch (e) {
    console.error('Error in sendToMatomo:', e);
  }
}

// Estrae IP da header
function extractIpFromHeader(val: string | null | undefined) {
  if (!val) return null;
  try {
    return String(val).split(',')[0].trim();
  } catch {
    return String(val);
  }
}

// POST endpoint (robust headers-only mode to avoid body parsing issues in production)
export async function POST(req: Request) {
  // Debug switch
  const debugHeaderRaw = String(req.headers.get('x-matomo-debug') || req.headers.get('x-debug-matomo') || '0');
  const debug = debugHeaderRaw === '1' || debugHeaderRaw.toLowerCase() === 'true';

  try {
    // Prefer header-based inputs to avoid parsing body in the edge environment
    const pageUrl =
      req.headers.get('x-page-url') ||
      req.headers.get('x-original-url') ||
      req.headers.get('referer') ||
      req.headers.get('referrer') ||
      null;

    const pageTitle = req.headers.get('x-page-title') || req.headers.get('x-title') || null;

    const ua = req.headers.get('x-original-user-agent') || req.headers.get('user-agent') || null;

    const ip = extractIpFromHeader(
      req.headers.get('x-original-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    ) || null;

    const referer = req.headers.get('referer') || req.headers.get('referrer') || null;

    console.log('Tracking POST (headers mode):', { pageUrl, pageTitle, ua, ip, referer });

    // Fire-and-forget to Matomo
    sendToMatomo({ pageUrl, pageTitle, ua, ip, referer }).catch((err) => {
      if (debug) console.warn('sendToMatomo failed (ignored):', err && (err as Error).message);
    });

    if (debug) {
      const debugPayload = { pageUrl, pageTitle, ua, ip, referer };
      return new Response(JSON.stringify(debugPayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error('Unhandled error in /api/matomo POST (headers mode):', e);
    if (debug) return new Response(JSON.stringify({ error: String(e) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return new Response(null, { status: 204 });
  }
}

// Per gli altri metodi HTTP
export async function GET() {
  return new Response(null, { status: 204 });
}
export async function PUT() {
  return new Response(null, { status: 204 });
}
export async function DELETE() {
  return new Response(null, { status: 204 });
}
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
