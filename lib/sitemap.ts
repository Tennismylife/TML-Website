import { prisma } from './prisma';

// --- RECORDS constants moved to module scope so helpers can be exported and reused ---
export const recordTabs = [
  'wins','played','count','titles','entries','ages','timespan','percentage','roundsonentries','same','seasons','atage','ageofnth','neededto','counterseasons','h2h','streak'
];

export const subTabsMap: Record<string,string[]> = {
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

export const surfaces = ['Hard','Clay','Grass','Carpet'];
export const levels = ['G','M','F','500','250','A','D'];
export const rounds = ['R128','R64','R32','R16','QF','SF','F'];
export const bestOfs = ['1','3','5'];

export function generateCandidateRecordRoutes(): string[] {
  const candidateRoutes: string[] = [];

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
    for (const s of surfaces) for (const b of bestOfs) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}&bestOf=${encodeURIComponent(b)}`);
    for (const l of levels) for (const b of bestOfs) candidateRoutes.push(`${basePath}?level=${encodeURIComponent(l)}&bestOf=${encodeURIComponent(b)}`);
    for (const r of rounds) for (const b of bestOfs) candidateRoutes.push(`${basePath}?round=${encodeURIComponent(r)}&bestOf=${encodeURIComponent(b)}`);

    for (const s of surfaces) for (const l of levels) for (const r of rounds) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}`);
    for (const s of surfaces) for (const l of levels) for (const b of bestOfs) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}&bestOf=${encodeURIComponent(b)}`);
    for (const s of surfaces) for (const r of rounds) for (const b of bestOfs) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}&round=${encodeURIComponent(r)}&bestOf=${encodeURIComponent(b)}`);
    for (const l of levels) for (const r of rounds) for (const b of bestOfs) candidateRoutes.push(`${basePath}?level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}&bestOf=${encodeURIComponent(b)}`);

    for (const s of surfaces) for (const l of levels) for (const r of rounds) for (const b of bestOfs) candidateRoutes.push(`${basePath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}&bestOf=${encodeURIComponent(b)}`);

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

      for (const s of surfaces) for (const b of bestOfs) candidateRoutes.push(`${subPath}?surface=${encodeURIComponent(s)}&bestOf=${encodeURIComponent(b)}`);
      for (const l of levels) for (const b of bestOfs) candidateRoutes.push(`${subPath}?level=${encodeURIComponent(l)}&bestOf=${encodeURIComponent(b)}`);
      for (const r of rounds) for (const b of bestOfs) candidateRoutes.push(`${subPath}?round=${encodeURIComponent(r)}&bestOf=${encodeURIComponent(b)}`);

      for (const s of surfaces) for (const l of levels) for (const r of rounds) candidateRoutes.push(`${subPath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}`);

      for (const s of surfaces) for (const l of levels) for (const b of bestOfs) candidateRoutes.push(`${subPath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}&bestOf=${encodeURIComponent(b)}`);
      for (const s of surfaces) for (const r of rounds) for (const b of bestOfs) candidateRoutes.push(`${subPath}?surface=${encodeURIComponent(s)}&round=${encodeURIComponent(r)}&bestOf=${encodeURIComponent(b)}`);
      for (const l of levels) for (const r of rounds) for (const b of bestOfs) candidateRoutes.push(`${subPath}?level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}&bestOf=${encodeURIComponent(b)}`);

      for (const s of surfaces) for (const l of levels) for (const r of rounds) for (const b of bestOfs) candidateRoutes.push(`${subPath}?surface=${encodeURIComponent(s)}&level=${encodeURIComponent(l)}&round=${encodeURIComponent(r)}&bestOf=${encodeURIComponent(b)}`);
    }
  }

export async function routeHasData(routePath: string, base?: string) {
  const _base = base ?? (process.env.SITE_URL || 'https://stats.tennismylife.org');
  try {
    const url = new URL(routePath, _base).toString();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return false;
    const json = await res.json();
    if (Array.isArray(json)) return json.length > 0;
    if (json && typeof json === 'object') return Object.keys(json).length > 0;
    return false;
  } catch (e) {
    return false;
  }
}

export async function getExistingRecordRoutes(concurrency = 20, base?: string): Promise<string[]> {
  // First try to read a cached list written by the local script (tmp/records-existing-routes.json)
  try {
    const fs = await import('fs');
    const fp = new URL('../tmp/records-existing-routes.json', import.meta.url);
    const s = await fs.promises.readFile(fp, 'utf8');
    const arr = JSON.parse(s);
    if (Array.isArray(arr) && arr.every(x => typeof x === 'string')) {
      return arr;
    }
  } catch (e) {
    // ignore and fallback to live checks
  }

  const existing: string[] = [];
  const candidates = generateCandidateRecordRoutes();
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(r => routeHasData(r, base)));
    for (let j = 0; j < batch.length; j++) if (results[j]) existing.push(batch[j]);
  }
  return existing;
}

export async function generateSitemapXml() {
  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // --- STATIC ROUTES ---
  const staticRoutes = [
    '/',
    '/records',
    '/ranking',
    '/players',
    '/tournaments',
    '/h2h',
    '/player-vs-player',
    '/statistics',
    '/seasons',
    '/forecasts',
    '/rankingtables',
  ];

  // --- PLAYERS ---
  const players = await prisma.player.findMany({
    select: { slug: true },
  });
  const playerUrls = players
    .filter(p => !!p.slug)
    .map(p => `/players/${p.slug}`);

  // --- TOURNAMENTS ---
  const tournaments = await prisma.tournament.findMany({
    select: { id: true, slug: true },
  });
  const tournamentMap: Record<string, string> = {};
  tournaments.forEach(t => {
    if (t.slug) tournamentMap[t.id] = t.slug;
  });
  const tournamentUrls = tournaments
    .filter(t => !!t.slug)
    .map(t => `/tournaments/${t.slug}`);

  // --- TOURNAMENT EDITIONS ---
  const editions = await prisma.match.findMany({
    select: { tourney_id: true, year: true },
    distinct: ['tourney_id', 'year'], // una sola volta per edizione
  });

  const editionUrls = editions
    .filter(e => e.tourney_id && e.year && tournamentMap[e.tourney_id])
    .map(e => `/tournaments/${tournamentMap[e.tourney_id]}/${e.year}`);

  // --- RECORDS combinations handled via exported helpers ---
  // use getExistingRecordRoutes() to compute which record routes actually return data


  // use exported getExistingRecordRoutes to determine which record routes exist
  const existingRecordRoutes = await getExistingRecordRoutes(20, base);

  const allRoutes = [...staticRoutes, ...playerUrls, ...tournamentUrls, ...editionUrls, ...existingRecordRoutes];

  // --- GENERATE XML ---
  // Escape XML special characters in URLs (ampersand will appear as &amp;)
  function escapeXml(str: string) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const urls = allRoutes
    .map(p => `  <url><loc>${escapeXml(base + p)}</loc><changefreq>weekly</changefreq></url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
