import fs from 'fs';
const source = fs.readFileSync('lib/seo/records-policy.ts', 'utf8');
const start = source.indexOf('const WHITELIST_RAW: WhitelistEntry[] = [');
const end = source.indexOf('];', start);
console.log('start', start, 'end', end);
const block = source.slice(start, end + 2);
const matches = block.match(/\{\s*slug:/g);
console.log('matches', matches ? matches.length : 0);
