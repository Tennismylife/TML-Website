const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

async function main(){
  const base = process.env.BASE_URL || 'http://localhost:3000';
  console.log('Base:', base);
  const urls = [
    `${base}/api/players/allmatches?id=p_test_a&year=2025`,
    `${base}/api/tournaments/999999/2025`
  ];
  for (const u of urls){
    try{
      console.log('Fetching', u);
      const r = await fetch(u);
      console.log('Status', r.status);
      const txt = await r.text();
      console.log('Body', txt.slice(0, 1000));
    } catch(e){
      console.error('Request failed', e);
    }
  }
}

main();