const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const url = 'https://stats.tennismylife.org/api/ranking?date=2026-06-01';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.rankings)) {
      throw new Error('Unexpected response format');
    }
    const top100 = data.rankings.filter((r) => Number(r.rank) <= 100).slice(0, 100);
    const slugs = top100.map((r) => String(r.slug).trim().toLowerCase()).filter(Boolean);
    const manual = ['alex-molcan'];
    const uniqueSlugs = Array.from(new Set([...slugs, ...manual]));
    const surfacePages = uniqueSlugs.flatMap((slug) => [
      `/players/${slug}/clay`,
      `/players/${slug}/hard`,
      `/players/${slug}/grass`,
    ]);
    const out = {
      generatedAt: new Date().toISOString(),
      source: url,
      snapshotDate: '2026-06-01',
      manualAllowlist: manual,
      top100Count: slugs.length,
      totalSlugs: uniqueSlugs.length,
      slugs: uniqueSlugs,
      surfacePages,
    };
    const filePath = path.join(process.cwd(), 'public', 'players-surface-whitelist.json');
    fs.writeFileSync(filePath, JSON.stringify(out, null, 2), 'utf-8');
    console.log('Wrote', filePath, 'with', uniqueSlugs.length, 'slugs and', surfacePages.length, 'page paths.');
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
