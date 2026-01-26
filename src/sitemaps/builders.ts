import { MAX_PER_FILE, SITE_ROOT } from './service';
import { urlEntry, xmlHeaderUrlset, xmlFooterUrlset, sitemapEntry } from './xml';

// Helper to chunk an async iterable into pages of size n
async function* chunkAsyncIterable<T>(iter: AsyncIterable<T>, size: number): AsyncGenerator<T[]> {
  let buffer: T[] = [];
  for await (const it of iter) {
    buffer.push(it);
    if (buffer.length >= size) {
      yield buffer;
      buffer = [];
    }
  }
  if (buffer.length) yield buffer;
}

export async function buildSectionPartitions(sectionSource: AsyncIterable<{ loc: string; changefreq?: string; priority?: string }>, maxPerFile?: number) {
  const perFile = typeof maxPerFile === 'number' ? maxPerFile : MAX_PER_FILE;
  const map = new Map<string, AsyncGenerator<string>>();
  // Partition into files of perFile
  let idx = 1;
  for await (const page of chunkAsyncIterable(sectionSource, perFile)) {
    const fileName = idx === 1 ? 'sitemap-sections.xml' : `sitemap-sections-${idx}.xml`;
    map.set(fileName, (async function* () {
      yield xmlHeaderUrlset();
      for (const u of page) yield urlEntry({ loc: SITE_ROOT.replace(/\/$/, '') + u.loc, changefreq: u.changefreq, priority: u.priority, lastmod: (u as any).lastmod });
      yield xmlFooterUrlset();
    })());
    idx++;
  }
  return map;
}

export async function buildPlayerPartitions(playerSource: AsyncIterable<{ slug: string; changefreq?: string; priority?: string; lastmod?: string }>, excludePrefixes: string[] = [], maxPerFile?: number) {
  const perFile = typeof maxPerFile === 'number' ? maxPerFile : MAX_PER_FILE;
  const groups: Record<string, Array<{ slug: string; changefreq?: string; priority?: string; lastmod?: string }>> = {};
  for await (const p of playerSource) {
    if (!p || !p.slug) continue;
    const slug = p.slug.toLowerCase();
    if (excludePrefixes && excludePrefixes.some(pre => slug.startsWith(pre))) continue;
    const letter = /^[a-z]/i.test(slug) ? slug[0].toUpperCase() : 'misc';
    const key = (letter >= 'A' && letter <= 'Z') ? letter : 'misc';
    groups[key] = groups[key] || [];
    groups[key].push({ slug, changefreq: p.changefreq, priority: p.priority, lastmod: p.lastmod });
  }

  const map = new Map<string, AsyncGenerator<string>>();
  for (const [letter, entries] of Object.entries(groups)) {
    let page = 1;
    for (let i = 0; i < entries.length; i += perFile) {
      const chunk = entries.slice(i, i + perFile);
      const fileName = page === 1 ? `sitemap-players-${letter}.xml` : `sitemap-players-${letter}-${page}.xml`;
      map.set(fileName, (async function* (chunkLocal) {
        yield xmlHeaderUrlset();
        for (const s of chunkLocal) yield urlEntry({ loc: SITE_ROOT.replace(/\/$/, '') + `/players/${s.slug}`, changefreq: s.changefreq, priority: s.priority, lastmod: s.lastmod });
        yield xmlFooterUrlset();
      })(chunk));
      page++;
    }
  }

  return map;
}

export async function buildTournamentPartitions(tournamentSource: AsyncIterable<{ slug: string; changefreq?: string; priority?: string; lastmod?: string }>, maxPerFile?: number) {
  const perFile = typeof maxPerFile === 'number' ? maxPerFile : MAX_PER_FILE;
  const groups: Record<string, Array<{ slug: string; changefreq?: string; priority?: string; lastmod?: string }>> = {};
  for await (const p of tournamentSource) {
    if (!p || !p.slug) continue;
    const slug = p.slug.toLowerCase();
    const letter = /^[a-z]/i.test(slug) ? slug[0].toUpperCase() : 'misc';
    const key = (letter >= 'A' && letter <= 'Z') ? letter : 'misc';
    groups[key] = groups[key] || [];
    groups[key].push({ slug, changefreq: p.changefreq, priority: p.priority, lastmod: p.lastmod });
  }

  const map = new Map<string, AsyncGenerator<string>>();
  for (const [letter, entries] of Object.entries(groups)) {
    let page = 1;
    for (let i = 0; i < entries.length; i += perFile) {
      const chunk = entries.slice(i, i + perFile);
      const fileName = page === 1 ? `sitemap-tournaments-${letter}.xml` : `sitemap-tournaments-${letter}-${page}.xml`;
      map.set(fileName, (async function* (chunkLocal) {
        yield xmlHeaderUrlset();
        for (const s of chunkLocal) {
          // root
          yield urlEntry({ loc: SITE_ROOT.replace(/\/$/, '') + `/tournaments/${s.slug}`, changefreq: s.changefreq, priority: s.priority, lastmod: s.lastmod });
          // records root and segments
          yield urlEntry({ loc: SITE_ROOT.replace(/\/$/, '') + `/tournaments/${s.slug}/records`, changefreq: 'daily', priority: '1.00', lastmod: s.lastmod });
          const tournamentRecordSegments = [
            'count/titles','count/wins','count/played','count/entries',
            'percentage/wins','percentage/rounds/R128','percentage/rounds/R64','percentage/rounds/R32','percentage/rounds/R16','percentage/rounds/QF','percentage/rounds/SF','percentage/rounds/F',
            'timespan/rounds/Titles','timespan/rounds/R128','timespan/rounds/R64','timespan/rounds/R32','timespan/rounds/R16','timespan/rounds/QF','timespan/rounds/SF','timespan/rounds/F',
            'roundsonentries/rounds/Winner','roundsonentries/rounds/R32','roundsonentries/rounds/R16','roundsonentries/rounds/QF','roundsonentries/rounds/SF','roundsonentries/rounds/F',
            'least/rounds/R32','least/rounds/R16','least/rounds/QF','least/rounds/SF','least/rounds/F','least/rounds/W',
            'ages/main/youngest','ages/main/oldest','ages/titles/youngest','ages/titles/oldest','ages/youngestrounds/R128','ages/youngestrounds/R64','ages/youngestrounds/R32','ages/youngestrounds/R16','ages/youngestrounds/QF','ages/youngestrounds/SF','ages/youngestrounds/F','ages/oldestrounds/R128','ages/oldestrounds/R64','ages/oldestrounds/R32','ages/oldestrounds/R16','ages/oldestrounds/QF','ages/oldestrounds/SF','ages/oldestrounds/F'
          ];
          for (const seg of tournamentRecordSegments) yield urlEntry({ loc: SITE_ROOT.replace(/\/$/, '') + `/tournaments/${s.slug}/records/${seg}`, changefreq: 'daily', priority: '1.00', lastmod: s.lastmod });
        }
        yield xmlFooterUrlset();
      })(chunk));
      page++;
    }
  }

  return map;
}

export async function listAllSitemapFiles(sectionMap: Map<string, AsyncGenerator<string>>, playerMap: Map<string, AsyncGenerator<string>>, tournamentMap?: Map<string, AsyncGenerator<string>>) {
  const files: { filename: string }[] = [];
  for (const k of sectionMap.keys()) files.push({ filename: k });
  for (const k of playerMap.keys()) files.push({ filename: k });
  if (tournamentMap) for (const k of tournamentMap.keys()) files.push({ filename: k });
  // Sort for deterministic index
  files.sort((a, b) => a.filename.localeCompare(b.filename));
  return files;
}
