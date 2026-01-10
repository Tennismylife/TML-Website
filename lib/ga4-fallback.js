// lib/ga4-fallback.js
// Minimal, isolated helper to send events to GA4 Measurement Protocol
// - Does NOT modify existing GA4 client; used only when frontend detects GA blocked
// - No external deps, uses native `https` and `crypto`

const https = require('https');
const crypto = require('crypto');

const COOKIE_NAME = 'ga_cid';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365 * 2; // 2 years

function parseCookie(header, name) {
  if (!header) return null;
  const cookies = header.split(';').map(c => c.trim());
  for (const c of cookies) {
    if (c.startsWith(name + '=')) return c.slice(name.length + 1);
  }
  return null;
}

function buildSetCookieHeader(name, value, opts = {}) {
  const parts = [`${name}=${value}`];
  parts.push(`Path=/`);
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

// Sanitize path to avoid sending query strings with potential PII
function sanitizePath(rawPath) {
  if (!rawPath) return '/';
  try {
    const u = new URL(rawPath, 'https://stats.tennismylife.org');
    return u.pathname;
  } catch (e) {
    // Fallback: drop querystring and fragment if present
    return (rawPath.split('?')[0] || '/');
  }
}

// Remove obvious email addresses from title to avoid PII
function sanitizeTitle(title) {
  if (!title) return '';
  return title.replace(/[\w.-]+@[\w.-]+/g, '[redacted]');
}

function makeClientId() {
  // GA client_id format isn't strictly enforced; use stable UUID-like string
  return crypto.randomUUID();
}

function sendToGa4(measurementId, apiSecret, payload, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const host = 'www.google-analytics.com';
    const path = `/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

    const req = https.request(
      {
        host,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve({ ok: true, status: res.statusCode });
          const err = new Error(`GA4 responded ${res.statusCode}: ${raw}`);
          err.statusCode = res.statusCode;
          return reject(err);
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

// Public handler used by server route
// Accepts optional { redis, inMemoryStats } to increment debug counters
async function handleGa4Fallback(req, res, options = {}) {
  const { redis, inMemoryStats } = options || {};

  // Increment 'received' here would be done in the route wrapper (server.js),
  // but we increment forwarding result counters here so we capture the GA send result.
  try {
    const measurementId = process.env.GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;
    if (!measurementId || !apiSecret) {
      return res.status(503).json({ error: 'GA4 not configured' });
    }

    const { page_path: pagePathRaw, page_title: rawTitle, referrer } = req.body || {};

    const page_path = sanitizePath(pagePathRaw);
    const page_title = sanitizeTitle(String(rawTitle || '')).slice(0, 150);

    // User agent: prefer explicit field, else header
    const user_agent = String(req.body.user_agent || req.headers['user-agent'] || '').slice(0, 512);

    let client_id = parseCookie(req.headers.cookie || '', COOKIE_NAME);
    let setCookieHeader = null;
    if (!client_id) {
      client_id = makeClientId();
      setCookieHeader = buildSetCookieHeader(COOKIE_NAME, client_id, {
        maxAge: COOKIE_MAX_AGE_SEC,
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
      });
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
            page_referrer: referrer || '',
          },
        },
      ],
    };

    // Best-effort send to GA; short timeout to avoid delaying responses
    try {
      await sendToGa4(measurementId, apiSecret, payload, 2000);
      // increment forward_ok counter (per-path)
      try {
        if (redis) await redis.hIncrBy('ga4_fallback:stats', `forward_ok:${req.path}`, 1);
        else if (inMemoryStats) inMemoryStats.forward_ok[req.path] = (inMemoryStats.forward_ok[req.path] || 0) + 1;
      } catch (e) {
        // non-fatal
      }

      if (setCookieHeader) res.setHeader('Set-Cookie', setCookieHeader);
      return res.status(204).end();
    } catch (err) {
      // send failed — increment forward_fail and respond 202
      try {
        if (redis) await redis.hIncrBy('ga4_fallback:stats', `forward_fail:${req.path}`, 1);
        else if (inMemoryStats) inMemoryStats.forward_fail[req.path] = (inMemoryStats.forward_fail[req.path] || 0) + 1;
      } catch (e) {
        // non-fatal
      }

      console.error('[GA4-FALLBACK ERROR]', err && err.message); // avoid logging full payload to protect privacy
      return res.status(202).json({ error: 'Event not persisted' });
    }
  } catch (err) {
    console.error('[GA4-FALLBACK ERROR]', err && err.message); // avoid logging full payload to protect privacy
    // Respond 202 to avoid failing client behavior if GA request failed
    return res.status(202).json({ error: 'Event not persisted' });
  }
}

// Serve a tiny 1x1 GIF and fire a page_view using Measurement Protocol
async function serveGif(req, res) {
  try {
    const measurementId = process.env.GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;
    if (!measurementId || !apiSecret) {
      return res.status(503).send('GA4 not configured');
    }

    const rawPath = (req.query && req.query.page_path) || req.path || '/';
    const page_path = sanitizePath(rawPath);
    const user_agent = String(req.headers['user-agent'] || '').slice(0, 512);

    let client_id = parseCookie(req.headers.cookie || '', COOKIE_NAME);
    let setCookieHeader = null;
    if (!client_id) {
      client_id = makeClientId();
      setCookieHeader = buildSetCookieHeader(COOKIE_NAME, client_id, {
        maxAge: COOKIE_MAX_AGE_SEC,
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    const payload = {
      client_id,
      user_agent,
      events: [
        {
          name: 'page_view',
          params: {
            page_location: page_path,
            page_title: '',
            page_referrer: String(req.headers.referer || '').slice(0, 512),
          },
        },
      ],
    };

    // Best-effort send to GA
    try {
      await sendToGa4(measurementId, apiSecret, payload, 1500);
    } catch (err) {
      // ignore forwarding errors for image beacon
    }

    if (setCookieHeader) res.setHeader('Set-Cookie', setCookieHeader);
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0');

    // 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
    return res.status(200).send(gif);
  } catch (err) {
    console.error('[GA4-FALLBACK GIF ERROR]', err && err.message);
    return res.status(500).send('error');
  }
}

module.exports = { handleGa4Fallback, COOKIE_NAME, serveGif };
