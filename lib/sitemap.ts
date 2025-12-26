import { prisma } from './prisma';

export async function generateSitemapXml() {
  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Static routes
  const staticRoutes = ['/', '/records', '/ranking', '/players', '/tournaments', '/h2h', '/player-vs-player', '/statistics', '/seasons', '/forecasts', '/rankingtables'];

  // Dynamic routes for players - include only those with DB slug
  const players = await prisma.player.findMany({ select: { id: true, player: true, atpname: true, slug: true } });
  const playerUrls = players
    .filter(p => !!p.slug)
    .map(p => `/players/${p.slug}`);

  // Dynamic routes for tournaments - include only those with DB slug
  const tournaments = await prisma.tournament.findMany({ select: { id: true, name: true, slug: true } });
  const tournamentUrls = tournaments
    .filter(t => !!t.slug)
    .map(t => `/tournaments/${t.slug}`);

  // Combine all routes
  const allRoutes = [...staticRoutes, ...playerUrls, ...tournamentUrls];

  const urls = allRoutes.map((p) => `  <url><loc>${base}${p}</loc><changefreq>daily</changefreq></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export async function getSitemapUrls() {
  const staticRoutes = ['/', '/records', '/ranking', '/players', '/tournaments', '/h2h', '/player-vs-player', '/statistics', '/seasons', '/forecasts', '/rankingtables'];

  const players = await prisma.player.findMany({
    select: { id: true, player: true, atpname: true, slug: true },
  });
  const playerUrls = players
    .filter(p => !!p.slug)
    .map(p => `/players/${p.slug}`);

  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true, slug: true },
  });
  const tournamentUrls = tournaments
    .filter(t => !!t.slug)
    .map(t => `/tournaments/${t.slug}`);

  return [...staticRoutes, ...playerUrls, ...tournamentUrls];
}
