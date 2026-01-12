import { prisma } from './prisma';

export async function getSitemapUrls() {
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

    // --- RECORDS DAILY ---
    '/records/same/playeddaily',
    '/records/same/entriesdaily',
    '/records/same/titlesdaily',
    '/records/same/rounddaily',
    '/records/seasons/winsdaily',
    '/records/seasons/playeddaily',
    '/records/seasons/entriesdaily',
    '/records/seasons/titlesdaily',
    '/records/seasons/rounddaily',
    '/records/seasons/percentagedaily',
    '/records/atage/winsdaily',
    '/records/atage/playeddaily',
    '/records/atage/entriesdaily',
    '/records/atage/titlesdaily',
    '/records/atage/slamsdaily',
    '/records/atage/rounddaily',
    '/records/ageofnth/winsdaily',
    '/records/ageofnth/playeddaily',
    '/records/ageofnth/entriesdaily',
    '/records/ageofnth/titlesdaily',
    '/records/ageofnth/slamsdaily',
    '/records/ageofnth/rounddaily',
    '/records/neededto/titlesdaily',
    '/records/counterseasons/rounddaily',
    '/records/counterseasons/titlesdaily',
    '/records/streak/winsdaily',
    '/records/streak/rounddaily',
    '/records/h2h/countdaily',
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
    .filter(e => e.tourney_id && e.year && tournamentMap[String(e.tourney_id)])
    .map(e => `/tournaments/${tournamentMap[String(e.tourney_id)]}/${e.year}`);

  // --- RECORDS DINAMICI ---
  let recordUrls: string[] = [];
  try {
    const mod = await import('../app/records/[...slug]/page');
    if (mod && typeof mod.generateStaticParams === 'function') {
      const params = await mod.generateStaticParams();
      if (Array.isArray(params)) {
        recordUrls = params
          .map((p: any) =>
            Array.isArray(p.slug) ? `/records/${p.slug.join('/')}` : `/records`
          )
          .filter(Boolean);
      }
    }
  } catch (e) {
    // ignore - sitemap should still work without records
    console.warn('Could not load dynamic record URLs:', e);
  }

  // --- COMBINE ALL ROUTES ---
  const allRoutes = [...staticRoutes, ...playerUrls, ...tournamentUrls, ...editionUrls, ...recordUrls];

  // remove duplicates
  return Array.from(new Set(allRoutes));
}

export async function generateSitemapXml() {
  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const allRoutes = await getSitemapUrls();

  // --- GENERATE XML ---
  const urls = allRoutes
    .map(p => `  <url><loc>${base}${p}</loc><changefreq>daily</changefreq></url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
