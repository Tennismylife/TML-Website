/**
 * Server-side Matomo tracking endpoint
 * - Accepts POST with JSON body containing: pageUrl, pageTitle, userAgent, ip
 * - Falls back to headers (Referer, User-Agent, X-Forwarded-For, X-Original-IP)
 * - Sends POST to Matomo HTTP Tracking API: idsite=1, rec=1, apiv=1
 * - Sets `ua` and `cip` where possible
 * - Always returns HTTP 204 (never surface errors to clients)
 * - Uses server-side fetch so it works even when client-side tracking is blocked by extensions
 */

import { NextRequest } from 'next/server';

const MATOMO_ENDPOINT = 'https://stats.tennismylife.org/matomo-tracking/matomo.php';
const TIMEOUT_MS = 2500;

async function sendToMatomo({ pageUrl, pageTitle, ua, ip, referer }: { pageUrl?: string | null; pageTitle?: string | null; ua?: string | null; ip?: string | null; referer?: string | null }) {
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

    // Matomo accepts POST with form data; include User-Agent header as a best-effort
    await fetch(MATOMO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': ua || '',
      },
      body: params.toString(),
      signal: controller.signal,
    }).catch(() => {});

    clearTimeout(timeout);
  } catch (e) {
    // swallow errors - tracking must never fail the client request
  }
}

function extractIpFromHeader(val: string | null | undefined) {
  if (!val) return null;
  try {
    return String(val).split(',')[0].trim();
  } catch (e) {
    return String(val);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const pageUrl = body?.pageUrl || body?.pageURL || req.headers.get('x-page-url') || req.headers.get('x-original-url') || req.headers.get('referer') || req.headers.get('referrer') || null;
    const pageTitle = body?.pageTitle || body?.title || null;

    const ua = body?.userAgent || body?.ua || req.headers.get('x-original-user-agent') || req.headers.get('user-agent') || null;
    const ip = body?.ip || extractIpFromHeader(req.headers.get('x-original-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')) || null;
    const referer = body?.referer || req.headers.get('referer') || req.headers.get('referrer') || null;

    // Fire-and-forget server-side POST to Matomo
    sendToMatomo({ pageUrl, pageTitle, ua, ip, referer }).catch(() => {});

    // Always return 204 to the client (do not surface errors)
    return new Response(null, { status: 204 });
  } catch (e) {
    // In the unlikely case of an unexpected error, still return 204
    return new Response(null, { status: 204 });
  }
}

// For other HTTP methods, return 204 without processing (keeps route tolerant and non-errored)
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
