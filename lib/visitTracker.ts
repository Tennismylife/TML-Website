import { prisma } from './prisma';

const BOT_RE = /(bot|crawl|spider|slurp|curl|wget)/i;

function getUserAgent(req: any): string | null {
  try {
    // prefer explicit forwarded header if present
    if (req?.headers?.get) {
      return String(req.headers.get('x-original-user-agent') || req.headers.get('user-agent') || null);
    }
    if (req?.headers) return String(req.headers['x-original-user-agent'] || req.headers['user-agent'] || req.headers['user-agent']?.[0] || null);
  } catch (e) {}
  return null;
}

function getIp(req: any): string | null {
  try {
    // prefer explicitly forwarded header
    if (req?.headers?.get) {
      const xff = req.headers.get('x-original-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
      if (xff) return String(xff.split(',')[0].trim());
      return null;
    }

    if (req?.headers) {
      const h = req.headers['x-original-ip'] || req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
      if (h) return String((Array.isArray(h) ? h[0] : h).split(',')[0].trim());
    }

    // Express style
    if (req?.ip) return String(req.ip);
    if (req?.connection?.remoteAddress) return String(req.connection.remoteAddress);
  } catch (e) {}
  return null;
}

function getUrl(req: any): string | null {
  try {
    // Next.js NextRequest has nextUrl
    if (req?.nextUrl?.href) return String(req.nextUrl.href);
    // Next.js server Request or fetch Request may have url
    if (req?.url) return String(req.url);

    // Express: reconstruct
    if (req?.originalUrl) {
      const host = (req.headers && (req.headers.host || req.headers.Host)) || '';
      const proto = req.protocol || (req.headers && (req.headers['x-forwarded-proto'] || 'http')) || 'http';
      return `${proto}://${host}${req.originalUrl}`;
    }
  } catch (e) {}
  return null;
}

/**
 * Save a visit record to PostgreSQL table `tracking_schema.visits`.
 * Accepts a NextRequest/Request-like object or an Express Request object.
 * Returns true if inserted, false if skipped (bot) or errored.
 */
export async function trackVisit(req: any, pageTitle?: string): Promise<boolean> {
  try {
    const ua = getUserAgent(req) || '';
    if (BOT_RE.test(ua)) {
      // common bots filtered
      return false;
    }

    const page_url = getUrl(req) || (typeof req === 'string' ? req : null);
    const user_ip = getIp(req);
    const user_agent = ua || null;
    const page_title = pageTitle || null;

    // Fire-and-forget: send server-side Matomo pageview (also helps when client-side JS is blocked by ad blockers)
    try {
      sendMatomoEvent({ url: page_url || undefined, title: page_title || undefined, ua: user_agent || undefined, ip: user_ip || undefined, referer: req?.headers?.get ? req.headers.get('referer') || req.headers.get('referrer') || undefined : req?.headers?.referer || undefined }).catch(() => {});
    } catch (e) {
      // ignore
    }

    // Insert into DB, swallow any errors but log them.
    try {
      const res: any = await prisma.$queryRaw`
        INSERT INTO tracking_schema.visits (page_url, page_title, user_ip, user_agent, created_at)
        VALUES (${page_url}, ${page_title}, ${user_ip}, ${user_agent}, now())
        RETURNING id
      `;
      return Array.isArray(res) ? !!res[0]?.id : !!res?.id;
    } catch (dbErr) {
      console.error('trackVisit: db insert error', dbErr);
      return false;
    }
  } catch (err) {
    console.error('trackVisit error', err);
    return false;
  }
}

// --- Matomo helper ---
async function sendMatomoEvent(opts: { url?: string; title?: string; ua?: string; ip?: string; referer?: string } ) {
  try {
    const endpointBase = 'https://stats.tennismylife.org/matomo-tracking/matomo.php';
    const params = new URLSearchParams();
    params.set('idsite', '1');
    params.set('rec', '1');
    if (opts.url) params.set('url', String(opts.url));
    if (opts.title) params.set('action_name', String(opts.title));
    if (opts.ip) params.set('cip', String(opts.ip));
    if (opts.ua) params.set('ua', String(opts.ua));
    if (opts.referer) params.set('urlref', String(opts.referer));

    const url = `${endpointBase}?${params.toString()}`;

    // Use a short timeout/abort to avoid holding server work
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    // Include User-Agent header and send a GET (Matomo accepts either GET/POST)
    await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': opts.ua || '',
      },
      signal: controller.signal,
    }).catch(() => {});

    clearTimeout(timeout);
  } catch (e) {
    // safe ignore — tracking must never fail the request
  }
}

/**
 * Small helper to use in Express apps as middleware:
 * app.use(trackVisitMiddleware()); or app.get('/', trackVisitMiddleware('Home'))
 */
export function trackVisitMiddleware(pageTitleOrResolver?: string | ((req: any) => string | Promise<string>)) {
  return async function (req: any, _res: any, next: any) {
    try {
      let title: string | undefined;
      if (typeof pageTitleOrResolver === 'function') title = await pageTitleOrResolver(req);
      else title = typeof pageTitleOrResolver === 'string' ? pageTitleOrResolver : undefined;
      // fire-and-forget
      trackVisit(req, title).catch(() => {});
    } catch (e) {
      // ignore
    }
    next();
  };
}
