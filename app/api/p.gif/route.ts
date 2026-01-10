// app/api/p.gif/route.ts
import { NextResponse } from 'next/server';
import { sendToGa4, sanitizePath, buildSetCookieHeader } from '../_ga4/handler';

// 1x1 transparent GIF (base64) — used to ensure onload fires in browsers
const GIF_1x1 = Buffer.from(
  'R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

export async function GET(req: Request) {
  try {
    const measurementId = process.env.GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;
    if (!measurementId || !apiSecret) {
      return NextResponse.json({ error: 'GA4 not configured' }, { status: 503 });
    }

    const url = new URL(req.url);
    const rawPath = url.searchParams.get('page_path') || '/';
    const page_path = sanitizePath(rawPath);

    // cookie handling
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('ga_cid='));
    let client_id = match ? match.split('=')[1] : null;
    let setCookie: string | undefined = undefined;
    if (!client_id) {
      client_id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
      setCookie = buildSetCookieHeader('ga_cid', client_id);
    }

    const payload = {
      client_id,
      user_agent: req.headers.get('user-agent') || '',
      events: [
        {
          name: 'page_view',
          params: {
            page_location: page_path,
            page_title: '',
            page_referrer: req.headers.get('referer') || ''
          }
        }
      ]
    };

    // Fire-and-forget to GA (best effort, short timeout)
    try {
      await sendToGa4(measurementId, apiSecret, payload, 1500);
    } catch (err) {
      // ignore — we still return a GIF so the client sees load result
    }

    const headers: Record<string,string> = { 'Content-Type': 'image/gif' };
    if (setCookie) headers['Set-Cookie'] = setCookie;

    return new Response(GIF_1x1, { status: 200, headers });
  } catch (err) {
    return NextResponse.json({}, { status: 500 });
  }
}
