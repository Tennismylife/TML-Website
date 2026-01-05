import { prisma } from './prisma';

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

  // --- COMBINE ALL ROUTES ---
  const allRoutes = [...staticRoutes, ...playerUrls, ...tournamentUrls, ...editionUrls];

  // --- GENERATE XML ---
  const urls = allRoutes
    .map(p => `  <url><loc>${base}${p}</loc><changefreq>daily</changefreq></url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
