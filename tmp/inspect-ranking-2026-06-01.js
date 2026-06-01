const url = 'https://stats.tennismylife.org/ranking?year=2026&date=2026-06-01';

(async () => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    console.error('status', res.status, res.headers.get('content-type'));
    const text = await res.text();
    console.error('length', text.length);
    console.log(text.slice(0, 5000));
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
