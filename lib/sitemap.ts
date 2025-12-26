import { prisma } from './prisma';

export async function generateSitemapXml() {
  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Static routes
  const staticRoutes = ['/', '/records', '/ranking', '/players', '/tournaments', '/h2h', '/player-vs-player', '/statistics', '/seasons', '/forecasts', '/rankingtables'];

  // Dynamic routes for players
  const players = await prisma.player.findMany({
    select: { id: true },
    take: 1000, // Limit to avoid huge sitemap
  });
  const playerUrls = players.map(p => `/players/${p.id}`);

  // Dynamic routes for tournaments
  const tournaments = await prisma.tournament.findMany({
    select: { id: true },
    take: 500, // Limit
  });
  const tournamentUrls = tournaments.map(t => `/tournaments/${t.id}`);

  // Combine all routes
  const allRoutes = [...staticRoutes, ...playerUrls, ...tournamentUrls];

  const urls = allRoutes.map((p) => `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export async function getSitemapUrls() {
  const staticRoutes = ['/', '/records', '/ranking', '/players', '/tournaments', '/h2h', '/player-vs-player', '/statistics', '/seasons', '/forecasts', '/rankingtables'];

  const players = await prisma.player.findMany({
    select: { id: true },
    take: 1000,
  });
  const playerUrls = players.map(p => `/players/${p.id}`);

  const tournaments = await prisma.tournament.findMany({
    select: { id: true },
    take: 500,
  });
  const tournamentUrls = tournaments.map(t => `/tournaments/${t.id}`);

  return [...staticRoutes, ...playerUrls, ...tournamentUrls];
}
