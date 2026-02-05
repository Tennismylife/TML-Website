const http = require('http');
const https = require('https');
(async ()=>{
  const url = process.argv[2] || 'http://localhost:3000/blog/2026-02-04-alcaraz-wins-australian-open-youngest-career-grand-slam';
  try{
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res)=>{
      let data='';
      res.on('data', c=>data+=c);
      res.on('end', ()=>{
        const scripts = [];
        const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let m;
        while((m = re.exec(data))!==null){
          scripts.push(m[1].trim());
        }
        console.log('Found', scripts.length, 'application/ld+json scripts');
        scripts.forEach((s,i)=>{
          console.log('\n--- script',i+1,'---');
          console.log(s.slice(0,800));
        });
      });
    }).on('error', e=>{ console.error('request error', e); });
  }catch(e){
    console.error('error',e);
  }
})();