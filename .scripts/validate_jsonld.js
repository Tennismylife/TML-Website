const http = require('http');
const url = 'http://localhost:3000/players/roger-federer/season/2006';
http.get(url, (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m; let i = 0; let found = false;
    while ((m = re.exec(b))) {
      i++;
      found = true;
      const raw = m[1].trim();
      try {
        const obj = JSON.parse(raw);
        console.log(`[${i}] type: ${obj['@type']}`);
        if (obj['@type'] === 'FAQPage') {
          console.log(` -> FAQPage mainEntity: ${Array.isArray(obj.mainEntity) ? obj.mainEntity.length : 0}`);
          (obj.mainEntity || []).forEach((q, idx) => {
            console.log(`   Q${idx+1}: ${q.name}`);
            const a = q.acceptedAnswer && (q.acceptedAnswer.text || (q.acceptedAnswer['text']));
            console.log(`   A${idx+1} (preview): ${a ? a.substring(0, 200) : '<no text>'}`);
          });
        }
      } catch (e) {
        console.error(`[${i}] JSON parse error: ${e.message}`);
      }
    }
    if (!found) console.log('No JSON-LD script tags found.');
  });
}).on('error', e => console.error('Request error:', e));