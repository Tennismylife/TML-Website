import { NextResponse } from 'next/server';

// Local trackVisit implementation: sends a GET to Matomo and logs result or error
async function trackVisit(reqLike: any, pageTitle?: string) {
  try {
    const ua = reqLike?.headers?.get ? (reqLike.headers.get('x-original-user-agent') || reqLike.headers.get('user-agent') || '') : (reqLike?.headers && (reqLike.headers['x-original-user-agent'] || reqLike.headers['user-agent'])) || '';
    const ip = reqLike?.headers?.get ? (reqLike.headers.get('x-original-ip') || reqLike.headers.get('x-forwarded-for') || reqLike.headers.get('x-real-ip') || '') : (reqLike?.headers && (reqLike.headers['x-original-ip'] || reqLike.headers['x-forwarded-for'] || reqLike.headers['x-real-ip'])) || '';
    const url = reqLike?.nextUrl?.href || reqLike?.url || '';

    const params = new URLSearchParams();
    params.set('idsite', '1');
    params.set('rec', '1');
    if (url) params.set('url', String(url));
    if (pageTitle) params.set('action_name', String(pageTitle));
    if (ip) params.set('cip', String(ip));
    if (ua) params.set('ua', String(ua));

    const base = process.env.SITE_URL || 'https://stats.tennismylife.org';
    const endpoint = `${base.replace(/\/$/, '')}/matomo-tracking/matomo.php?${params.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(endpoint, { method: 'GET', headers: { 'User-Agent': ua || '' }, signal: controller.signal });
      clearTimeout(timeout);
      let body = '<no body>';
      try { body = await res.text(); } catch (e) { /* ignore */ }
      console.log('matomo track result', { status: res.status, ok: res.ok, body: body.slice(0, 200) });
      return true;
    } catch (e) {
      clearTimeout(timeout);
      console.error('matomo track error', e);
      return false;
    }
  } catch (err) {
    console.error('trackVisit internal error', err);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Accept JSON body with optional pageTitle/pageUrl
    const body = await req.json().catch(() => ({}));
    const pageTitle = body?.pageTitle ?? null;
    const pageUrl = body?.pageUrl ?? null;

    // Compose a small, safe request-like object that provides headers.get and nextUrl.href
    const uaHeader = req.headers.get('x-original-user-agent') || req.headers.get('user-agent') || '';
    const xip = req.headers.get('x-original-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

    const pseudoReq: any = {
      headers: {
        get: (k: string) => {
          if (k.toLowerCase() === 'user-agent') return uaHeader;
          if (k.toLowerCase() === 'x-forwarded-for' || k.toLowerCase() === 'x-real-ip' || k.toLowerCase() === 'x-original-ip') return xip;
          return req.headers.get(k);
        },
      },
      // Provide the page URL if available (from middleware), else the request url
      nextUrl: { href: pageUrl || '' },
      url: pageUrl || '',
    };

    // Fire-and-forget: do not await, but log if it errors
    trackVisit(pseudoReq as any, pageTitle).catch((e) => console.error('trackVisit (API) failed', e));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('track-visit route error', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
