import { prisma } from './prisma';

const BOT_RE = /(bot|crawl|spider|slurp|curl|wget)/i;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getUserAgent(req: any): string | null {
  try {
    if (req?.headers?.get) {
      return String(
        req.headers.get('x-original-user-agent') ||
        req.headers.get('user-agent') ||
        null
      );
    }
    if (req?.headers)
      return String(
        req.headers['x-original-user-agent'] ||
        req.headers['user-agent'] ||
        req.headers['user-agent']?.[0] ||
        null
      );
  } catch {}
  return null;
}

function getIp(req: any): string | null {
  try {
    if (req?.headers?.get) {
      const xff =
        req.headers.get('x-original-ip') ||
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip');
      if (xff) return String(xff.split(',')[0].trim());
      return null;
    }

    if (req?.headers) {
      const h =
        req.headers['x-original-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'];
      if (h)
        return String(
          (Array.isArray(h) ? h[0] : h).split(',')[0].trim()
        );
    }

    if (req?.ip) return String(req.ip);
    if (req?.connection?.remoteAddress)
      return String(req.connection.remoteAddress);
  } catch {}
  return null;
}

function getUrl(req: any): string | null {
  try {
    if (req?.nextUrl?.href) return String(req.nextUrl.href);
    if (req?.url) return String(req.url);

    if (req?.originalUrl) {
      const host =
        (req.headers &&
          (req.headers.host || req.headers.Host)) ||
        '';
      const proto =
        req.protocol ||
        (req.headers &&
          (req.headers['x-forwarded-proto'] || 'http')) ||
        'http';
      return `${proto}://${host}${req.originalUrl}`;
    }
  } catch {}
  return null;
}

// ------------------------------------------------------------
// MAIN FUNCTION
// ------------------------------------------------------------

export async function trackVisit(
  req: any,
  pageTitle?: string
): Promise<boolean> {
  try {
    if (process.env.DISABLE_TRACKING === '1') return false;

    const ua = getUserAgent(req) || '';
    if (BOT_RE.test(ua)) return false;

    const page_url =
      getUrl(req) || (typeof req === 'string' ? req : null);

    const user_ip = getIp(req);
    const user_agent = ua || null;
    const page_title = pageTitle || null;

    // Matomo SSR (fire-and-forget)
    try {
      sendMatomoEvent({
        url: page_url || undefined,
        title: page_title || undefined,
        ua: user_agent || undefined,
        ip: user_ip || undefined,
        referer: req?.headers?.get
          ? req.headers.get('referer') ||
            req.headers.get('referrer') ||
            undefined
          : req?.headers?.referer || undefined,
      }).catch(() => {});
    } catch {}

    // DB insert
    try {
      const res: any = await prisma.$queryRaw`
        INSERT INTO tracking_schema.visits
          (page_url, page_title, user_ip, user_agent, created_at)
        VALUES
          (${page_url}, ${page_title}, ${user_ip}, ${user_agent}, now())
        RETURNING id;
      `;
      return Array.isArray(res)
        ? !!res[0]?.id
        : !!res?.id;
    } catch (dbErr) {
      if (process.env.VERBOSE_LOGS === '1')
        console.error('trackVisit: db insert error', dbErr);
      return false;
    }
  } catch (err) {
    if (process.env.VERBOSE_LOGS === '1')
      console.error('trackVisit error', err);
    return false;
  }
}

// ------------------------------------------------------------
// FIXED Matomo server-side event
// ------------------------------------------------------------

async function sendMatomoEvent(opts: {
  url?: string;
  title?: string;
  ua?: string;
  ip?: string;
  referer?: string;
}) {
  try {
    // Passa SEMPRE dalla tua API che normalizza tutto
    const endpointBase = 'https://stats.tennismylife.org/api/matomo';

    const params = new URLSearchParams();

    if (opts.title)
      params.set('action_name', String(opts.title));

    // Sanitize URL
    if (opts.url) {
      let u = String(opts.url);
      u = u.replace(
        /^https?:\/\/localhost(:\d+)?/i,
        'https://stats.tennismylife.org'
      );
      params.set('url', u);
    }

    // NON spedire mai 127.0.0.1
    if (
      opts.ip &&
      opts.ip !== '127.0.0.1' &&
      opts.ip !== '::1'
    ) {
      params.set('cip', String(opts.ip));
    }

    if (opts.ua) params.set('ua', opts.ua);
    if (opts.referer) params.set('urlref', opts.referer);

    params.set('r', Math.random().toString());

    const finalUrl = `${endpointBase}?${params.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      2500
    );

    await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': opts.ua || '',
      },
      signal: controller.signal,
      cache: 'no-store',
    }).catch(() => {});

    clearTimeout(timeout);
  } catch {}
}

// ------------------------------------------------------------
// Middleware helper
// ------------------------------------------------------------

export function trackVisitMiddleware(
  pageTitleOrResolver?:
    | string
    | ((req: any) => string | Promise<string>)
) {
  return async function (req: any, _res: any, next: any) {
    try {
      let title: string | undefined;
      if (typeof pageTitleOrResolver === 'function')
        title = await pageTitleOrResolver(req);
      else if (typeof pageTitleOrResolver === 'string')
        title = pageTitleOrResolver;

      trackVisit(req, title).catch(() => {});
    } catch {}
    next();
  };
}