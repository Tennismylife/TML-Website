import type { NextApiRequest, NextApiResponse } from 'next';

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
    console.error('Matomo send error', e);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = req.body || {};
    const pageUrl = body.pageUrl || req.headers.referer || '';
    const pageTitle = body.pageTitle || '';
    const ua = req.headers['user-agent'] || '';
    const ip = Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    const referer = req.headers.referer || '';

    sendToMatomo({ pageUrl, pageTitle, ua, ip, referer }).catch(() => {});

    res.status(204).end(); // mai fallire il client
  } catch (err) {
    console.error('Matomo API error:', err);
    res.status(204).end();
  }
}
