import express from 'express';
import { getPlayersForSitemap, getSectionUrlsForSitemap, SITE_ROOT, EXCLUDE_PREFIXES, MAX_PER_FILE, CACHE_MAX_AGE } from './service';
import { buildSectionPartitions, buildPlayerPartitions, listAllSitemapFiles } from './builders';
import { sendXmlStream } from './response';
import { xmlHeaderSitemapIndex, xmlFooterSitemapIndex, sitemapEntry } from './xml';

const router = express.Router();

// GET /sitemap_index.xml
router.get('/sitemap_index.xml', async (req, res) => {
  // Build partitions (using mocks) — in production use streaming DB
  const sectionMap = await buildSectionPartitions(getSectionUrlsForSitemap());
  const playerMap = await buildPlayerPartitions(getPlayersForSitemap(), EXCLUDE_PREFIXES);
  const files = await listAllSitemapFiles(sectionMap, playerMap);

  const gen = (async function* () {
    yield xmlHeaderSitemapIndex();
    for (const f of files) {
      const loc = SITE_ROOT.replace(/\/$/, '') + `/sitemaps/${f.filename}`;
      yield sitemapEntry({ loc });
    }
    yield xmlFooterSitemapIndex();
  })();

  await sendXmlStream(req, res, gen, { cacheSec: CACHE_MAX_AGE });
});

// Dynamic: serve any sitemap file built by builders
router.get('/:fname', async (req, res, next) => {
  try {
    const fname = String(req.params.fname || '');
    // Create maps on demand
    const sectionMap = await buildSectionPartitions(getSectionUrlsForSitemap());
    const playerMap = await buildPlayerPartitions(getPlayersForSitemap(), EXCLUDE_PREFIXES);

    const maps = new Map([...sectionMap.entries(), ...playerMap.entries()]);
    // Accept both exact names and with .xml
    const key = fname;
    if (!maps.has(key)) return next();

    const gen = maps.get(key)!;
    await sendXmlStream(req, res, gen, { cacheSec: CACHE_MAX_AGE });
  } catch (e) {
    next(e);
  }
});

export default router;