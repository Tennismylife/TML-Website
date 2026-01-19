import { NextResponse } from 'next/server';

import { trackVisit as libTrackVisit } from '../../../lib/visitTracker';


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

    // If running locally or tracking is explicitly disabled, skip Matomo calls
    const isLocal = process.env.NODE_ENV === 'development' || process.env.DISABLE_TRACKING === '1' || String(process.env.SITE_URL || '').includes('localhost');
    if (isLocal) {
      if (process.env.VERBOSE_LOGS === '1') console.debug('track-visit: skipping Matomo tracking in local/dev environment');
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Fire-and-forget: call shared visit tracker (handles DB insert + Matomo probe). Do not await.
    try {
      libTrackVisit(pseudoReq as any, pageTitle).catch((e) => console.error('trackVisit (API) failed', e));
    } catch (e) {
      console.error('track-visit: failed to call libTrackVisit', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('track-visit route error', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
