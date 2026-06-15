import fs from 'fs';
const path = 'lib/seo/records-policy.ts';
const text = fs.readFileSync(path, 'utf8');
const regex = /title:\s*'([^']*)'/g;
const titles = [];
let m;
while ((m = regex.exec(text)) !== null) titles.push(m[1]);
console.log(titles.length);
console.log(titles.join('\n'));
