(async () => {
  try {
    const Route = await import('../app/api/og/tournament/[id]/route');
    const req = new Request('http://localhost/?page=records&tab=count');
    const res = await Route.GET(req, { params: { id: 'australian-open' } });

    if (!res || !res.arrayBuffer) {
      console.error('Route did not return a valid Response-like object');
      process.exit(1);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const fs = require('fs');
    fs.writeFileSync('preview.png', buf);
    console.log('Saved preview.png', buf.length, 'bytes');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();