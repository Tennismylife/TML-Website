#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/records/Streak/WinsSection.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = [
  // Hard Court section
  ['<strong>Roger Federer</strong>, who won 56 consecutive matches on hard courts between February 2005 and March 2006', '<span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, who won <strong className="!text-amber-300">56</strong> consecutive matches on hard courts between <strong className="!text-sky-300">February 2005 and March 2006</strong>'],
  ['where <strong>Rafael Nadal</strong> beat him 2-6, 6-4, 6-4', 'where <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/rafael-nadal" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> beat him 2-6, 6-4, 6-4'],
  ['Second on the list is <strong>Jimmy Connors</strong>, with 47 consecutive hard-court wins between 1974 and 1975', 'Second on the list is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/jimmy-connors" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, with <strong className="!text-amber-300">47</strong> consecutive hard-court wins between <strong className="!text-sky-300">1974 and 1975</strong>'],
  ['where <strong>Adriano Panatta</strong> defeated him 4-6, 6-3, 7-5', 'where <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><Link href="/players/adriano-panatta" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Adriano Panatta</Link></span> defeated him 4-6, 6-3, 7-5'],
  ['Federer also owns the third-longest hard-court streak, with 36 straight wins from the 2006 US Open to Indian Wells 2007', 'Federer also owns the third-longest hard-court streak, with <strong className="!text-amber-300">36</strong> straight wins from <strong className="!text-sky-300">the 2006 US Open to Indian Wells 2007</strong>'],
  ['was stopped by <strong>Guillermo Cañas</strong>, who beat Federer 7-5, 6-2', 'was stopped by <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href="/players/guillermo-canas" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillermo Cañas</Link></span>, who beat Federer 7-5, 6-2'],
  ['Novak Djokovic follows with a 35-match hard-court winning streak from December 2010 to August 2011', '<span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> follows with a <strong className="!text-amber-300">35</strong>-match hard-court winning streak from <strong className="!text-sky-300">December 2010 to August 2011</strong>'],
  ['when Andy Murray led 6-4, 3-0 before', 'when <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><Link href="/players/andy-murray" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andy Murray</Link></span> led 6-4, 3-0 before'],
  ['Together, these streaks define the highest marks of sustained performance on hard courts: Federer at 56, Connors at 47, Federer again at 36, and Djokovic at 35', 'Together, these streaks define the highest marks of sustained performance on hard courts: Federer at <strong className="!text-amber-300">56</strong>, Connors at <strong className="!text-amber-300">47</strong>, Federer again at <strong className="!text-amber-300">36</strong>, and Djokovic at <strong className="!text-amber-300">35</strong>'],
];

for (const [old, newStr] of replacements) {
  if (content.includes(old)) {
    content = content.replace(old, newStr);
    console.log(`✓ ${old.substring(0, 50)}...`);
  } else {
    console.warn(`⚠️  Not found: "${old.substring(0, 50)}..."`);
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('\n✅ Hard Court section updated with flags, links and colors!');
