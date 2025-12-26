import { prisma } from './prisma';

// Function to create URL-friendly slug from text
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Function to extract name from Json field
function extractName(nameField: any): string {
  if (typeof nameField === 'string') return nameField;
  if (nameField && typeof nameField === 'object') {
    // Try to get English name first, then any available name
    return nameField.en || nameField.default || Object.values(nameField)[0] || '';
  }
  return '';
}

export async function generateSitemapXml() {
  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Static routes
  const staticRoutes = ['/', '/records', '/ranking', '/players', '/tournaments', '/h2h', '/player-vs-player', '/statistics', '/seasons', '/forecasts', '/rankingtables'];

  // Dynamic routes for players - use slugs instead of IDs
  const players = await prisma.player.findMany({
    select: { id: true, player: true, atpname: true },
    take: 1000, // Limit to avoid huge sitemap
  });
  const playerUrls = players.map(p => {
    const name = p.atpname || p.player || p.id;
    const slug = createSlug(name);
    return `/players/${slug}`;
  });

  // Dynamic routes for tournaments - use slugs instead of IDs
  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true },
    take: 500, // Limit
  });
  const tournamentUrls = tournaments.map(t => {
    const name = extractName(t.name) || `tournament-${t.id}`;
    const slug = createSlug(name);
    return `/tournaments/${slug}`;
  });

  // Combine all routes
  const allRoutes = [...staticRoutes, ...playerUrls, ...tournamentUrls];

  const urls = allRoutes.map((p) => `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export async function getSitemapUrls() {
  const staticRoutes = ['/', '/records', '/ranking', '/players', '/tournaments', '/h2h', '/player-vs-player', '/statistics', '/seasons', '/forecasts', '/rankingtables'];

  const players = await prisma.player.findMany({
    select: { id: true, player: true, atpname: true },
    take: 1000,
  });
  const playerUrls = players.map(p => {
    const name = p.atpname || p.player || p.id;
    const slug = createSlug(name);
    return `/players/${slug}`;
  });

  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true },
    take: 500,
  });
  const tournamentUrls = tournaments.map(t => {
    const name = extractName(t.name) || `tournament-${t.id}`;
    const slug = createSlug(name);
    return `/tournaments/${slug}`;
  });

  return [...staticRoutes, ...playerUrls, ...tournamentUrls];
}
