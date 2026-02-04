#!/usr/bin/env node
// scripts/check-redirects.js
// Simple audit tool to check redirects for a list of important paths.

const { URL } = require('url');

async function getFetch() {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch.bind(globalThis);
  // Fallback: try dynamic import of node-fetch (v3 is ESM default export)
  try {
    const mod = await import('node-fetch');
    return mod.default;
  } catch (e) {
    throw new Error('No fetch available. Run on Node 18+ or install a fetch polyfill (node-fetch)');
  }
}

(async () => {
  const fetch = await getFetch();

  const base = process.env.NEXT_PUBLIC_SITE_URL || process.argv[2] || 'http://localhost:3000';
  const paths = [
    '/records?record=wins&subtab=oldest-winners&surface=Hard',
    '/records/ages?subtab=youngestWinners&foo=bar',
    '/records/ages',
    '/records',
    '/players/123',
    '/players/abc123',
    '/players/novak-djokovic',
    '/tournaments/123',
    '/tournaments/W367',
    '/recordsranking/Some/Path',
    '/players/novak-djokovic/statistics'
  ];

  console.log(`Checking redirects against base: ${base}\n`);

  let problems = 0;
  for (const p of paths) {
    const url = new URL(p, base).toString();
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'manual' });
      const status = res.status;
      const location = res.headers && (res.headers.get ? res.headers.get('location') || res.headers.get('Location') : null) || null;

      const isRedirect = status >= 300 && status < 400;
      const ok = isRedirect ? !!location : status >= 200 && status < 400;

      const noteParts = [];
      if (isRedirect) noteParts.push(`redirect -> ${location}`);
      else noteParts.push(`status ${status}`);

      // If NEXT_PUBLIC_SITE_URL is set, ensure redirects point to that origin
      if (process.env.NEXT_PUBLIC_SITE_URL && isRedirect && location) {
        try {
          const locOrigin = new URL(location).origin;
          if (locOrigin !== (new URL(process.env.NEXT_PUBLIC_SITE_URL)).origin) {
            noteParts.push(`WRONG HOST (expected ${new URL(process.env.NEXT_PUBLIC_SITE_URL).origin})`);
            problems++;
          }
        } catch (e) {
          noteParts.push('INVALID LOCATION');
          problems++;
        }
      }

      // Flag 5xx/4xx on non-redirects
      if (!isRedirect && status >= 400) {
        noteParts.push('ERROR RESPONSE');
        problems++;
      }

      const okMark = problems ? '⚠️' : '✅';

      console.log(`${okMark} ${p} -> ${noteParts.join(' | ')}`);
    } catch (err) {
      console.error(`❌ ${p} -> fetch error: ${err.message}`);
      problems++;
    }
  }

  console.log('\nSummary:');
  if (problems === 0) console.log('✅ All checked paths look OK');
  else console.log(`⚠️ Detected ${problems} potential problem(s).`);

  process.exit(problems === 0 ? 0 : 2);
})();
