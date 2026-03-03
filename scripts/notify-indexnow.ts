#!/usr/bin/env node

/**
 * Command‑line wrapper around lib/indexnow.notifyIndexNow.
 *
 * Usage:
 *   ts-node scripts/notify-indexnow.ts url1 url2 ...
 *
 * It reads INDEXNOW_KEY and INDEXNOW_KEY_LOCATION from env.
 */

import { notifyIndexNow } from '../lib/indexnow';

async function main() {
  const key = process.env.INDEXNOW_KEY;
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION;
  let args = process.argv.slice(2);

  if (!key || !keyLocation) {
    console.error('Please set INDEXNOW_KEY and INDEXNOW_KEY_LOCATION in environment');
    process.exit(1);
  }

  // support --sitemap flag to grab entries from the generated sitemap
  const useSitemap = args.includes('--sitemap');
  args = args.filter(a => a !== '--sitemap');

  const urls: string[] = [];
  if (useSitemap) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
    if (!siteUrl) {
      console.error('SITE_URL/NEXT_PUBLIC_SITE_URL must be set when using --sitemap');
      process.exit(1);
    }

    // if we've already generated the sitemap XML in public/, read that file first
    const fs = await import('fs');
    const path = await import('path');
    const tryFiles = [
      path.join(process.cwd(), 'public', 'sitemap.generated.xml'),
      path.join(process.cwd(), 'public', 'sitemap_index.xml'),
      path.join(process.cwd(), 'public', 'sitemap.xml'),
    ];
    let xml: string | undefined;
    for (const f of tryFiles) {
      if (fs.existsSync(f)) {
        xml = fs.readFileSync(f, 'utf8');
        console.log('loaded sitemap from', f);
        break;
      }
    }

    if (xml) {
      const base = siteUrl.replace(/\/+$/, '');
      // simple regex to pull loc values
      const locs = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g)).map(m => m[1]);
      for (const loc of locs) {
        // if loc is absolute, keep it; otherwise prepend base
        if (/^https?:\/\//.test(loc)) urls.push(loc);
        else urls.push(base + loc);
      }
      console.log(`collected ${urls.length} urls from existing sitemap file`);
    } else {
      // fallback to computing from scratch (slow) if no file
      console.warn('no existing sitemap file found, falling back to live generation');
      try {
        const { getSitemapEntries } = await import('../lib/sitemap');
        const entries = await getSitemapEntries();
        const base = siteUrl.replace(/\/+$/, '');
        for (const e of entries) {
          if (!e.path) continue;
          urls.push(base + e.path);
        }
        console.log(`collected ${urls.length} urls from sitemap`);
      } catch (err: any) {
        console.error('failed to load sitemap entries:', err.message || err);
        process.exit(3);
      }
    }
  }

  // any remaining command-line args are treated as explicit urls
  urls.push(...args);

  if (urls.length === 0) {
    console.error('Usage: notify-indexnow.ts [--sitemap] <url> [more urls]');
    process.exit(1);
  }

  try {
    const resp = await notifyIndexNow(urls, key, keyLocation);
    console.log('IndexNow response:', resp);
  } catch (err: any) {
    console.error('Error sending IndexNow:', err.message || err);
    process.exit(2);
  }
}

main();
