#!/usr/bin/env node
const jiti = require('jiti')(__filename);
(async function(){
  try{
    const { getSitemapEntries } = jiti(require('path').join(process.cwd(), 'lib', 'sitemap'));
    for (const opts of [undefined, {}, {excludePlayers:true}, {excludeTournaments:true}, {excludePlayers:true, excludeTournaments:true}]){
      const entries = await getSitemapEntries(opts);
      const tot = entries.length;
      const players = entries.filter(e => e.path.startsWith('/players')).length;
      const tournaments = entries.filter(e => e.path.startsWith('/tournaments')).length;
      console.log('opts=', opts, 'total=', tot, 'players=', players, 'tournaments=', tournaments);
    }
  }catch(err){
    console.error('ERR', err);
    process.exit(1);
  }
})();
