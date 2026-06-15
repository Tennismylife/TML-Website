#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/records/Streak/WinsSection.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = [
  // Correggi Connors hard court: 47 → 49, Salt Lake City → Little Rock
  ['Second on the list is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/jimmy-connors" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, with <strong className="!text-amber-300">47</strong> consecutive hard-court wins between <strong className="!text-sky-300">1974 and 1975</strong>. His streak started at Salt Lake City 1974', 'Second on the list is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/jimmy-connors" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, with <strong className="!text-amber-300">49</strong> consecutive hard-court wins between <strong className="!text-sky-300">1974 and 1975</strong>. His streak started at Little Rock 1974'],
  // Aggiorna anche il totale finale
  ['Connors at <strong className="!text-amber-300">47</strong>', 'Connors at <strong className="!text-amber-300">49</strong>'],
];

for (const [old, newStr] of replacements) {
  if (content.includes(old)) {
    content = content.replace(old, newStr);
    console.log(`✓ Updated: ${old.substring(0, 50)}...`);
  } else {
    console.warn(`⚠️  Not found: "${old.substring(0, 50)}..."`);
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('\n✅ Connors hard court data corrected: 49 wins, Little Rock!');
