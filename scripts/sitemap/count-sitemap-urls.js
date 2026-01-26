#!/usr/bin/env node
const path = require('path');

async function main(){
  try{
    const jiti = require('jiti')(__filename);
    const sitemap = jiti(path.join(process.cwd(),'lib','sitemap.ts'));
    if (!sitemap || typeof sitemap.generateSitemapXml !== 'function') throw new Error('generateSitemapXml not found');
    const xml = await sitemap.generateSitemapXml();
    const matches = xml.match(/<url>/g) || [];
    console.log('URLs in sitemap:', matches.length);
    process.exit(0);
  }catch(e){
    console.error('Error:', e);
    process.exit(1);
  }
}
main();
