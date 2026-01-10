// app/api/_ga4/handler.ts
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'ga_cid';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365 * 2; // 2 years
const GA_HOST = 'https://www.google-analytics.com';

function sanitizePath(rawPath?: unknown) {
  try {
    if (!rawPath || typeof rawPath !== 'string') return '/';
    const u = new URL(rawPath, 'https://example.com');
    return u.pathname;
  } catch {
    return (String(rawPath || '/')).split('?')[0] || '/';
  }
}

function sanitizeTitle(title?: unknown) {
  if (!title) return '';
  return String(title).replace(/[\w.-]+@[\w.-]+/g, '[redacted]').slice(0, 150);
}

function makeClientId() {
  // stable uuid-like value
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildSetCookieHeader(name: string, value: string) {
  const parts = [`${name}=${value}`, `Path=/`, `Max-Age=${COOKIE_MAX_AGE_SEC}`, `HttpOnly`, `SameSite=Lax`];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

async function sendToGa4(measurementId: string, apiSecret: string, payload: any, timeoutMs = 2000) {
  const url = `${GA_HOST}/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (res.ok) return { ok: true, status: res.status };
    const txt = await res.text().catch(() => '');
    throw new Error(`GA4 responded ${res.status}: ${txt}`);
  } finally {
    clearTimeout(id);
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

/**
 * Main handler that accepts a Request and returns a NextResponse.
 * - Expects JSON { page_path, page_title, referrer?, user_agent? }
 * - Creates/reuses HttpOnly cookie `ga_cid`, calls GA4 MP
 * - Returns 204 on success, 202 on best-effort failure, 503 if misconfigured
 */
export async function handleGa4Post(req: Request) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });

  try {
    const measurementId = process.env.GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;
    if (!measurementId || !apiSecret) {
      return NextResponse.json({ error: 'GA4 not configured' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const page_path = sanitizePath(body.page_path);
    const page_title = sanitizeTitle(body.page_title);
    const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 512) : '';
    const user_agent = typeof body.user_agent === 'string' ? body.user_agent.slice(0, 512) : (req.headers.get('user-agent') || '').slice(0, 512);

    // cookie handling: prefer incoming cookie, otherwise create new client_id
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`));
    let client_id = match ? match.split('=')[1] : null;
    let setCookie: string | undefined = undefined;
    if (!client_id) {
      client_id = makeClientId();
      setCookie = buildSetCookieHeader(COOKIE_NAME, client_id);
    }

    const payload = {
      client_id,
      user_agent,
      events: [
        {
          name: 'page_view',
          params: {
            page_location: page_path,
            page_title,
            page_referrer: referrer,
          },
        },
      ],
    };

    try {
      await sendToGa4(measurementId, apiSecret, payload, 2000);
      const headers = setCookie ? { 'Set-Cookie': setCookie } : undefined;
      return new Response(null, { status: 204, headers });
    } catch (err) {
      // best-effort: do not break the client flow
      console.warn('[ga4-next] forward failed', err && (err as Error).message);
      const headers = setCookie ? { 'Set-Cookie': setCookie } : undefined;
      return NextResponse.json({ error: 'Event not persisted' }, { status: 202, headers });
    }
  } catch (err) {
    console.error('[ga4-next] unexpected', err && (err as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export helpers for use by other routes (image beacon GET)
export { sendToGa4, sanitizePath, buildSetCookieHeader };