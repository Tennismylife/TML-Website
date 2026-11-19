#!/usr/bin/env node
// 2026 ATP Week 42, singles main draws. Values represent bracket slots 1..32,
// with null for BYE. Qualifiers and lucky losers updated 19 October.
// Week 42: R32 participants incl. Lyon qualifiers/Brussels replacements.\n// R16 includes confirmed H2Hs + all still-feasible hypothetical H2Hs,\n// excluding losers of completed R32 and withdrawn participants.
const fs = require('fs');
const path = require('path');

const draws = {
  lyon: [
    ['flavio-cobolli', null],
    ['stan-wawrinka','martin-landaluce'],
    ['matteo-berrettini','kyrian-jacquet'],
    ['hamad-medjedovic','brandon-nakashima'],
    ['valentin-vacherot',null],
    ['luca-van-assche','clement-tabur'],
    ['lorenzo-sonego','moise-kouame'],
    ['matteo-arnaldi','lorenzo-musetti'],
    ['ugo-humbert','corentin-moutet'],
    ['jaime-faria','felix-balshaw'],
    ['benjamin-bonzi','cameron-norrie'],
    [null,'tommy-paul'],
    ['arthur-fery','borna-gojo'],
    ['daniel-altmaier','titouan-droguet'],
    ['pierre-hugues-herbert','sebastian-baez'],
    [null,'taylor-fritz']
  ],
  brussels: [
    ['arthur-fils',null],
    ['federico-cina','jaume-munar'],
    ['david-goffin','remy-bertola'],
    ['andrea-guerrieri','alex-michelsen'],
    ['gauthier-onclin',null],
    ['jan-lennard-struff','marcos-giron'],
    ['dino-prizmic','damir-dzumhur'],
    ['toby-samuel','zizou-bergs'],
    ['botic-van-de-zandschulp','clement-chidekh'],
    ['jacob-fearnley','hugo-gaston'],
    ['yannick-hanfmann','martin-damm'],
    [null,'francisco-cerundolo'],
    ['mariano-navone','juan-manuel-cerundolo'],
    ['tallon-griekspoor','max-schoenhaus'],
    ['nishesh-basavareddy','raphael-collignon'],
    [null,'jiri-lehecka']
  ],
  almaty: [
    ['daniil-medvedev',null],
    ['sho-shimabukuro','roman-safiullin'],
    ['terence-atmane','rinky-hijikata'],
    ['mattia-bellucci','tomas-martin-etcheverry'],
    ['alexander-bublik',null],
    ['fabian-marozsan','timofey-skatov'],
    ['zangar-nurlanuly','tomas-machac'],
    ['rei-sakamoto','karen-khachanov'],
    ['thiago-agustin-tirante','facundo-diaz-acosta'],
    ['marin-cilic','nikoloz-basilashvili'],
    ['adrian-mannarino','aleksandar-vukic'],
    [null,'andrey-rublev'],
    ['stefanos-tsitsipas','aleksandar-kovacevic'],
    ['mikhail-kukushkin','stefanos-sakellaridis'],
    ['miomir-kecmanovic','james-duckworth'],
    [null,'luciano-darderi']
  ]
};

const base = 'https://stats.tennismylife.org';
const outputDir = path.join(__dirname,'..','..','public','sitemaps');
const asOf = '2026-10-21';
const stages = ['R32','R16','QF'];
const priorities = {R32:'1.0',R16:'0.9',QF:'0.8'};
const isPlayer = p => p && p !== 'Q';
const unifiedFile = 'sitemap-h2h-lyon-brussels-almaty-2026.xml';
const obsoleteFiles = Object.keys(draws).map(t => `sitemap-h2h-${t}-2026.xml`);
// Winners from completed R32 (0-based match index in each draw).
// Unplayed R32 preserve possible R16 opponents; completed R32 retain
// only the actual winner. Never publish a withdrawn/eliminated player as R16.
const winners = {
  lyon: {2:'kyrian-jacquet',3:'brandon-nakashima',5:'luca-van-assche',6:'moise-kouame',7:'lorenzo-musetti',8:'corentin-moutet',9:'felix-balshaw',10:'benjamin-bonzi',12:'borna-gojo',13:'daniel-altmaier',14:'pierre-hugues-herbert'},
  brussels: {1:'jaume-munar',3:'alex-michelsen',5:'jan-lennard-struff',7:'zizou-bergs',8:'clement-chidekh',9:'jacob-fearnley',10:'martin-damm',12:'mariano-navone',13:'tallon-griekspoor',14:'raphael-collignon'},
  almaty: {1:'sho-shimabukuro',2:'terence-atmane',5:'fabian-marozsan',7:'karen-khachanov',8:'facundo-diaz-acosta',9:'nikoloz-basilashvili',10:'adrian-mannarino',12:'stefanos-tsitsipas',13:'mikhail-kukushkin',14:'james-duckworth'}
};
const collected = [];
const allUrls = new Set();
for (const [tournament, matches] of Object.entries(draws)) {
  const slots=matches.flat();
  const real=slots.filter(isPlayer);
  if (matches.length!==16 || slots.length!==32 ||
      slots.filter(x=>x===null).length!==4 ||
      slots.some(x=>x==='Q') || real.length!==28 ||
      new Set(real).size!==28)
    throw Error('Unexpected 28-player draw: '+tournament);
  const perStage={R32:[],R16:[],QF:[]};
  function addUrl(a,b,stage) {
    if (!isPlayer(a)||!isPlayer(b)||a===b) throw Error('Invalid matchup '+a+' '+b);
    const sorted=[a,b].sort();
    const url=base+'/h2h/'+sorted[0]+'-vs-'+sorted[1];
    if (allUrls.has(url)) throw Error('Duplicate H2H: '+url);
    allUrls.add(url);
    perStage[stage].push(url);
  }
  // Publish every actual R32 pairing, including already-played matches.
  for(const [a,b] of matches) {
    if(isPlayer(a) && isPlayer(b)) addUrl(a,b,'R32');
  }
  // One R16 bracket group = two adjacent first-round encounters.
  const candidates=matches.map((pair,i)=>{
    const w=(winners[tournament]||{})[i];
    if (w && !pair.includes(w)) throw Error('Winner not in bracket: '+tournament+' '+i+' '+w);
    return w ? [w] : pair.filter(isPlayer);
  });
  let confirmedR16=0;
  for(let i=0;i<16;i+=2){
    const left=candidates[i], right=candidates[i+1];
    if(!left.length||!right.length) throw Error('Empty R16: '+tournament+' '+i);
    if(left.length===1 && right.length===1) confirmedR16++;
    for(const a of left) for(const b of right) addUrl(a,b,'R16');
  }
  // QF bracket: the winners of two adjacent R16 matches meet.
  // Until an R16 winner is known, preserve every still-possible player
  // from its two R32 matches. Never cross separate QF quarters.
  for (let i=0;i<16;i+=4) {
    const left=[...new Set([...candidates[i],...candidates[i+1]])];
    const right=[...new Set([...candidates[i+2],...candidates[i+3]])];
    if (!left.length || !right.length) throw Error('Empty QF: '+tournament+' '+i);
    for (const a of left) for (const b of right) addUrl(a,b,'QF');
  }
  if (perStage.R32.length!==12||perStage.R16.length<8||perStage.QF.length<4)
    throw Error('Unexpected counts: '+tournament);
  const count=perStage.R32.length+perStage.R16.length+perStage.QF.length;
  collected.push({tournament,perStage,confirmedR16});
  console.log(tournament.toUpperCase(),'R32',perStage.R32.length,'R16',perStage.R16.length,'QF',perStage.QF.length,'CONFIRMED_R16',confirmedR16,'TOTAL',count);
}
if(allUrls.size!==collected.reduce((n,t)=>n+t.perStage.R32.length+t.perStage.R16.length+t.perStage.QF.length,0)) throw Error('URL count mismatch');
const entries=[];
for(const {tournament,perStage,confirmedR16} of collected) {
  entries.push(`  <!-- ${tournament.toUpperCase()} -->`);
  for(const stage of stages) {
    const urls=[...perStage[stage]].sort();
    entries.push(`  <!-- ${stage}: ${urls.length} ${stage==='R32'?'draw matchups':(stage==='R16' ? confirmedR16+' confirmed, '+(urls.length-confirmedR16)+' possible' : urls.length+' hypothetical QF')} -->`);
    for (const url of urls) {
      entries.push(`  <url>\n    <loc>${url}</loc>\n    <lastmod>${asOf}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${priorities[stage]}</priority>\n  </url>`);
    }
  }
}
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
const unifiedPath=path.join(outputDir,unifiedFile);
fs.writeFileSync(unifiedPath+'.tmp',xml,'utf8');
fs.renameSync(unifiedPath+'.tmp',unifiedPath);
// Preserve all unrelated index entries, removing only the three obsolete sitemap references.
const idxPath=path.join(outputDir,'sitemap_index.xml');
let idx=fs.readFileSync(idxPath,'utf8');
for (const name of obsoleteFiles) {
  const escaped=name.replace(/[.*+?^$()|[\]{}]/g,'\\$&');
  const re=new RegExp(`\\s*<sitemap>\\s*<loc>${base.replace(/[.*+?^$()|[\]{}]/g,'\\$&')}/sitemaps/${escaped}</loc>\\s*</sitemap>`,'g');
  idx=idx.replace(re,'');
}
const unifiedLoc=`${base}/sitemaps/${unifiedFile}`;
if(!idx.includes(`<loc>${unifiedLoc}</loc>`))
  idx=idx.replace('</sitemapindex>',`  <sitemap>\n    <loc>${unifiedLoc}</loc>\n  </sitemap>\n</sitemapindex>`);
fs.writeFileSync(idxPath+'.tmp',idx,'utf8');
fs.renameSync(idxPath+'.tmp',idxPath);
for(const f of obsoleteFiles) {
  const fp=path.join(outputDir,f);
  if(fs.existsSync(fp))fs.unlinkSync(fp);
}
console.log('UNIFIED INDEX UPDATED',unifiedFile,'URLS',allUrls.size,'OBSOLETE REMOVED',obsoleteFiles.join(','));
