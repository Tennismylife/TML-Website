const MATOMO_ENDPOINT = 'https://stats.tennismylife.org/matomo-tracking/matomo.php';
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
  } catch (e) {
    // swallow errors — tracking must never fail the client
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

    const pageUrl = body?.pageUrl || body?.pageURL || req.headers.get('referer') || req.headers.get('referrer') || null;
    const pageTitle = body?.pageTitle || body?.title || null;

    const ua = body?.userAgent || body?.ua || req.headers.get('user-agent') || null;
    const ip = body?.ip || extractIpFromHeader(req.headers.get('x-original-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')) || null;
    const referer = body?.referer || req.headers.get('referer') || req.headers.get('referrer') || null;

    // Fire-and-forget to Matomo
    sendToMatomo({ pageUrl, pageTitle, ua, ip, referer }).catch(() => {});

    return new Response(null, { status: 204 });
  } catch (e) {
    return new Response(null, { status: 204 });
  }
}

export async function GET() {
  return new Response(null, { status: 204 });
}
