#!/usr/bin/env node
/* Regenerate all sitemap files by mounting the sitemaps router locally and fetching files
   Usage: node scripts/regenerate-all-sitemaps.js
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
const express = require('express');

async function main() {
  const router = require(path.join(process.cwd(), 'src', 'sitemaps', 'routes'));
  const app = express();
  app.use('/sitemaps', router);
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/sitemaps`;
  console.log('Temporary sitemap server at', base);

  try {
    const res = await fetch(base + '/sitemap_index.xml');
    if (!res.ok) throw new Error('Failed fetching sitemap_index: ' + res.status);
    const body = await res.text();
    // extract <loc>...</loc>
    const locs = Array.from(body.matchAll(/<loc>(.*?)<\/loc>/g)).map(m => m[1]);
    const outDir = path.join(process.cwd(), 'public', 'sitemaps');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    for (const loc of locs) {
      // Derive filename
      try {
        const u = new URL(loc);
        const fname = path.basename(u.pathname);
        const url = base + '/' + fname; // fetch local router
        console.log('Fetching', url);
        const r = await fetch(url, { headers: { 'accept-encoding': 'gzip' } });
        if (!r.ok) { console.warn('Failed to fetch', url, r.status); continue; }
        const buf = await r.buffer();
        // If server returned gzipped data, assume compressed; try to detect
        const isGz = buf.slice(0,2).equals(Buffer.from([0x1f,0x8b]));
        let xmlBuf;
        if (isGz) xmlBuf = zlib.gunzipSync(buf);
        else xmlBuf = buf;
        const outPath = path.join(outDir, fname);
        fs.writeFileSync(outPath, xmlBuf);
        const gz = zlib.gzipSync(xmlBuf, { level: 6 });
        fs.writeFileSync(outPath + '.gz', gz);
        console.log('Saved', outPath, 'len', xmlBuf.length, 'gz', gz.length);
      } catch (e) {
        console.warn('Error processing loc', loc, e);
      }
    }

    // rebuild sitemap_index from files
    require('./generate_sitemap_index');

  } finally {
    server.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
