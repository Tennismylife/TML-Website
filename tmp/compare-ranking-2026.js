const fetchRankings = async (date) => {
  const url = `https://stats.tennismylife.org/api/ranking?date=${date}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.rankings)) throw new Error('Unexpected ranking format');
  return data.rankings.filter(r => Number(r.rank) <= 100).slice(0, 100).map(r => String(r.slug).trim().toLowerCase());
};

(async () => {
  try {
    const prev = await fetchRankings('2026-04-20');
    const now = await fetchRankings('2026-06-01');
    const prevSet = new Set(prev);
    const added = now.filter(slug => !prevSet.has(slug));
    console.log('added count', added.length);
    console.log(JSON.stringify(added, null, 2));
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
