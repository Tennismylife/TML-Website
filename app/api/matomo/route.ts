/**
 * Server-side Matomo tracking endpoint
 * BOT-SAFE VERSION — blocks all crawlers before logging
 */

import { NextRequest } from 'next/server';

// --- Bot detection ---------------------------------------------------------

const BOT_PATTERNS = [
  /googlebot/i,
  /googleother/i,
  /inspectiontool/i,
  /bingbot/i,
  /duckduckbot/i,
  /applebot/i,
  /amazonbot/i,
  /facebookexternalhit/i,
  /meta-externalagent/i,
  /bytespider/i,
  /perplexitybot/i,
  /chatgpt-user/i,
  /oai-searchbot/i,
  /ahrefs/i,
  /semrush/i,
  /mj12bot/i,
  /crawler/i,
  /spider/i,
  /bot/i
];

function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return BOT_PATTERNS.some((p) => p.test(ua));
}

// ---------------------------------------------------------------------------

const MATOMO_ENDPOINT =
  'https://stats.tennismylife.org/matomo-tracking/matomo.php';
const TIMEOUT_MS = 2500;

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
    }).catch(() => {});

    clearTimeout(timeout);
  } catch {}
}

function extractIpFromHeader(val: string | null | undefined) {
  if (!val) return null;
  try {
    return String(val).split(',')[0].trim();
  } catch {
    return String(val);
  }
}

// --- Main POST handler -----------------------------------------------------

export async function POST(req: Request) {
  const ua =
    req.headers.get('x-original-user-agent') ||
    req.headers.get('user-agent') ||
    null;

  // 🚫 BLOCK BOTS — do not log, do not forward to Matomo
  if (isBot(ua)) {
    return new Response(null, { status: 204 });
  }

  // Extract headers normally
  const pageUrl =
    req.headers.get('x-page-url') ||
    req.headers.get('x-original-url') ||
    req.headers.get('referer') ||
    req.headers.get('referrer') ||
    null;

  const pageTitle =
    req.headers.get('x-page-title') || req.headers.get('x-title') || null;

  const ip =
    extractIpFromHeader(
      req.headers.get('x-original-ip') ||
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip')
    ) || null;

  const referer =
    req.headers.get('referer') || req.headers.get('referrer') || null;

  // Fire-and-forget
  sendToMatomo({ pageUrl, pageTitle, ua, ip, referer }).catch(() => {});

  return new Response(null, { status: 204 });
}

// Other methods
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