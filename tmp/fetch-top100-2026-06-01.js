const url = 'https://stats.tennismylife.org/api/ranking?date=2026-06-01';

(async () => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    console.error('status', res.status, res.headers.get('content-type'));
    const data = await res.json();
    if (!data || !Array.isArray(data.rankings)) {
      console.error('Unexpected response:', data);
      process.exit(1);
    }
    console.log(JSON.stringify(data.rankings.slice(0, 5), null, 2));
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
