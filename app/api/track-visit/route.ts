import { NextResponse } from 'next/server';
import { trackVisit } from '../../../lib/visitTracker';

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
