#!/usr/bin/env node
// scripts/export-records-metadata.js
// Usage: node scripts/export-records-metadata.js <tournament-slug> [output.csv] [baseUrl]

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
let fetch;
try {
  // node-fetch v3 is ESM; this handles both CJS require and ESM default
  fetch = require('node-fetch');
  if (fetch && fetch.default) fetch = fetch.default;
} catch (e) {
  // fallback to global fetch if available (Node 18+)
  fetch = global.fetch;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'records-exporter/1.0' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

function extractMetadata(html, url) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const title = (doc.querySelector('title')?.textContent || '').trim();
  const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const canonical = doc.querySelector("link[rel='canonical']")?.getAttribute('href') || doc.querySelector("meta[property='og:url']")?.getAttribute('content') || url;
  return { title, description, canonical };
}

function normalizeUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch (e) {
    return null;
  }
}

async function crawlRecords(tourneySlug, outFile, baseUrl) {
  const startPath = `/tournaments/${encodeURIComponent(tourneySlug)}/records`;
  const startUrl = new URL(startPath, baseUrl).toString();

  const results = [];
  const visited = new Set();
  const toVisit = new Set();

  // always include the root
  toVisit.add(startUrl);

  // add a set of common record root pages
  const roots = [
    `/tournaments/${tourneySlug}/records`,
    `/tournaments/${tourneySlug}/records/count/titles`,
    `/tournaments/${tourneySlug}/records/count/wins`,
    `/tournaments/${tourneySlug}/records/count/played`,
    `/tournaments/${tourneySlug}/records/count/entries`,
    `/tournaments/${tourneySlug}/records/titles`,
    `/tournaments/${tourneySlug}/records/ages/titles/youngest`,
    `/tournaments/${tourneySlug}/records/ages/titles/oldest`,
    `/tournaments/${tourneySlug}/records/percentage`,
    `/tournaments/${tourneySlug}/records/least`,
    `/tournaments/${tourneySlug}/records/roundsonentries`,
    `/tournaments/${tourneySlug}/records/rounds`,
    `/tournaments/${tourneySlug}/records/streak`,
    `/tournaments/${tourneySlug}/records/timespan`,
  ];
  for (const r of roots) toVisit.add(new URL(r, baseUrl).toString());

  // helper to add page if not visited
  const queuePush = (u) => { if (!visited.has(u)) toVisit.add(u); };

  // attempt to enumerate round-like pages by consulting API endpoints
  const apiCandidates = [
    `/api/tournaments/${tourneySlug}/records/roundsonentries`,
    `/api/tournaments/${tourneySlug}/records/timespan`,
    `/api/tournaments/${tourneySlug}/records/percentage/rounds`,
    `/api/tournaments/${tourneySlug}/records/rounds`,
  ];

  for (const apiPath of apiCandidates) {
    const apiUrl = new URL(apiPath, baseUrl).toString();
    try {
      console.log('Querying API', apiUrl);
      const res = await fetch(apiUrl);
      if (!res.ok) { console.debug('API not available', apiUrl, res.status); continue; }
      const json = await res.json();
      // try multiple common keys
      const candidates = [];
      if (Array.isArray(json.allRoundItems)) candidates.push(...json.allRoundItems.map((it) => it.title ?? it.round ?? it.name).filter(Boolean));
      if (Array.isArray(json.roundItems)) candidates.push(...json.roundItems.map((it) => it.title ?? it.round ?? it.name).filter(Boolean));
      if (Array.isArray(json.allRoundItems ?? json.roundItems ?? [])) candidates.push(...(json.allRoundItems ?? json.roundItems ?? []).map((it) => it.title ?? it.round ?? it.name).filter(Boolean));

      for (const t of Array.from(new Set(candidates))) {
        // add sensible target pages for various sections using the round/title
        queuePush(new URL(`/tournaments/${tourneySlug}/records/rounds/${encodeURIComponent(String(t))}`, baseUrl).toString());
        queuePush(new URL(`/tournaments/${tourneySlug}/records/percentage/rounds/${encodeURIComponent(String(t))}`, baseUrl).toString());
        queuePush(new URL(`/tournaments/${tourneySlug}/records/least/rounds/${encodeURIComponent(String(t))}`, baseUrl).toString());
        queuePush(new URL(`/tournaments/${tourneySlug}/records/roundsonentries/rounds/${encodeURIComponent(String(t))}`, baseUrl).toString());
        queuePush(new URL(`/tournaments/${tourneySlug}/records/timespan/rounds/${encodeURIComponent(String(t))}`, baseUrl).toString());
      }
    } catch (err) {
      console.debug('API error', apiUrl, err.message);
    }
  }

  // BFS over discovered pages (toVisit set)
  while (toVisit.size > 0) {
    const u = toVisit.values().next().value;
    toVisit.delete(u);
    if (visited.has(u)) continue;
    visited.add(u);

    try {
      console.log('Fetching', u);
      const html = await fetchHtml(u);
      const meta = extractMetadata(html, u);
      results.push({ title: meta.title, link: u, canonical: meta.canonical, description: meta.description });

      // parse some server-rendered links to discover more pages
      const dom = new JSDOM(html);
      const anchors = Array.from(dom.window.document.querySelectorAll('a[href]'));
      for (const a of anchors) {
        const href = a.getAttribute('href');
        if (!href) continue;
        const full = normalizeUrl(href, baseUrl);
        if (!full) continue;
        try {
          const uobj = new URL(full);
          if (uobj.origin !== new URL(baseUrl).origin) continue;
          if (uobj.pathname.startsWith(`/tournaments/${tourneySlug}/records`)) {
            queuePush(full);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Failed to fetch', u, err.message);
    }
  }

  // Deduplicate by link (preserve first seen)
  const unique = [];
  const seenLinks = new Set();
  for (const r of results) {
    if (!seenLinks.has(r.link)) {
      unique.push(r);
      seenLinks.add(r.link);
    }
  }

  // Write CSV
  const csvLines = ['"title","link","canonical","description"'];
  for (const row of unique) {
    const esc = (s) => '"' + String(s || '').replace(/"/g, '""') + '"';
    csvLines.push([esc(row.title), esc(row.link), esc(row.canonical), esc(row.description)].join(','));
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, csvLines.join('\n'), 'utf8');
  console.log('Wrote', outFile, 'with', unique.length, 'entries');
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/export-records-metadata.js <tournament-slug> [output.csv] [baseUrl]');
    process.exit(1);
  }
  const out = process.argv[3] || `tmp/records-${slug}.csv`;
  const base = process.argv[4] || (process.env.SITE_URL || 'http://localhost:3000');
  await crawlRecords(slug, out, base);
}

main().catch((err) => { console.error(err); process.exit(1); });
