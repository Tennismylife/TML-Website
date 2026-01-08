#!/usr/bin/env node
// Self-contained script to generate candidate record routes and check which ones return data
import fetch from 'node-fetch';

const recordTabs = [
  'wins','played','count','titles','entries','ages','timespan','percentage','roundsonentries','same','seasons','atage','ageofnth','neededto','counterseasons','h2h','streak'
];

const subTabsMap = {
  ages: ['oldest','youngest','oldest-winners','youngest-winners'],
  timespan: ['entries','titles','rounds'],
  roundsonentries: ['titles','round'],
  same: ['wins','played','entries','titles','round'],
  seasons: ['wins','played','entries','titles','round','percentage'],
  atage: ['wins','played','entries','titles','slams','round'],
  ageofnth: ['wins','played','entries','titles','slams','round'],
  neededto: ['titles'],
  counterseasons: ['round','titles'],
  streak: ['wins','round'],
  h2h: ['count'],
};

const surfaces = ['Hard','Clay','Grass','Carpet'];
const levels = ['G','M','F','500','250','A','D'];
const rounds = ['R128','R64','R32','R16','QF','SF','F'];
const bestOfs = ['1','3','5'];

function generateCandidateRecordRoutes() {
  const candidateRoutes = [];
  for (const tab of recordTabs) {
    const basePath = `/records/${encodeURIComponent(tab)}`;
    candidateRoutes.push(basePath);

    for (const s of surfaces) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}`);
    for (const l of levels) candidateRoutes.push(`${basePath}?level=${encodeURIComponent(l)}`);
    for (const r of rounds) candidateRoutes.push(`${basePath}?round=${encodeURIComponent(r)}`);
    for (const b of bestOfs) candidateRoutes.push(`${basePath}?bestOf=${encodeURIComponent(b)}`);

    for (const s of surfaces) for (const l of levels) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}`);
    for (const s of surfaces) for (const r of rounds) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}&round=${encodeURIComponent(r)}`);
    for (const l of levels) for (const r of rounds) candidateRoutes.push(`${basePath}?level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}`);

    for (const s of surfaces) for (const l of levels) for (const r of rounds) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}`);

    const subtabs = subTabsMap[tab] ?? [];
    for (const sub of subtabs) {
      const subPath = `${basePath}/${encodeURIComponent(sub)}`;
      candidateRoutes.push(subPath);

      for (const s of surfaces) candidateRoutes.push(`${subPath}?surface=${encodeURIComponent(s)}`);
      for (const l of levels) candidateRoutes.push(`${subPath}?level=${encodeURIComponent(l)}`);
      for (const r of rounds) candidateRoutes.push(`${subPath}?round=${encodeURIComponent(r)}`);
      for (const b of bestOfs) candidateRoutes.push(`${subPath}?bestOf=${encodeURIComponent(b)}`);

      for (const s of surfaces) for (const l of levels) candidateRoutes.push(`${subPath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}`);
      for (const s of surfaces) for (const r of rounds) candidateRoutes.push(`${subPath}?surface=${encodeURIComponent(s)}&round=${encodeURIComponent(r)}`);
      for (const l of levels) for (const r of rounds) candidateRoutes.push(`${subPath}?level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}`);
    }
  }
  return candidateRoutes;
}

async function routeHasData(routePath, base) {
  const _base = base || process.env.SITE_URL || 'https://stats.tennismylife.org';
  try {
    // Convert page route to API route: /records/... -> /api/records/...
    const apiPath = routePath.replace(/^\/records/, '/api/records');
    const url = new URL(apiPath, _base).toString();
    const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) return false;
    const json = await res.json();
    if (Array.isArray(json)) return json.length > 0;
    if (json && typeof json === 'object') return Object.keys(json).length > 0;
    return false;
  } catch (e) {
    return false;
  }
}

async function getExistingRecordRoutes(concurrency = 20, base) {
  const existing = [];
  const candidates = generateCandidateRecordRoutes();
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(r => routeHasData(r, base)));
    for (let j = 0; j < batch.length; j++) if (results[j]) existing.push(batch[j]);
  }
  return existing;
}

(async () => {
  console.log('Generating candidates...');
  const candidates = generateCandidateRecordRoutes();
  console.log('Candidates:', candidates.length);

  console.log('Checking existing routes (this may take a while)...');
  const existing = await getExistingRecordRoutes(50);
  console.log('Existing routes:', existing.length);
  existing.slice(0, 200).forEach(r => console.log(r));

  // Write to tmp file for reuse in sitemap generation
  try {
    const fs = await import('fs');
    const outPath = new URL('../tmp/records-existing-routes.json', import.meta.url);
    await fs.promises.mkdir(new URL('../tmp/', import.meta.url), { recursive: true });
    await fs.promises.writeFile(outPath, JSON.stringify(existing, null, 2), 'utf8');
    console.log('Wrote existing routes to', outPath.pathname);
  } catch (e) {
    console.error('Failed to write existing routes file:', e);
  }
})();
