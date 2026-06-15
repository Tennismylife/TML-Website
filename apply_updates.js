#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/records/Streak/WinsSection.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = [
  // Sezione 1: Longest Win Streak
  [
    'At the top stands <strong>Björn Borg</strong>',
    'At the top stands <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><Link href="/players/bjorn-borg" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Björn Borg</Link></span>'
  ],
  ['of 49 and 48 consecutive wins', 'of <strong className="!text-amber-300">49</strong> and <strong className="!text-amber-300">48</strong> consecutive wins'],
  ['<strong>Guillermo Vilas</strong>, whose 46-match', '<span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href="/players/guillermo-vilas" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillermo Vilas</Link></span>, whose <strong className="!text-amber-300">46</strong>-match'],
  ['in 1977 remains', 'in <strong className="!text-sky-300">1977</strong> remains'],
  ['<strong>Ivan Lendl</strong>, with 44 straight', '<span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><Link href="/players/ivan-lendl" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ivan Lendl</Link></span>, with <strong className="!text-amber-300">44</strong> straight'],
  ['between 1981 and 1982, and <strong>Novak Djokovic</strong>, whose 43-match', 'between <strong className="!text-sky-300">1981 and 1982</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, whose <strong className="!text-amber-300">43</strong>-match'],
  ['from late 2010 to the 2011 French Open', 'from late <strong className="!text-sky-300">2010 to the 2011</strong> French Open'],
  ['<strong>John McEnroe</strong> followed with 42 consecutive', '<span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/john-mcenroe" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">John McEnroe</Link></span> followed with <strong className="!text-amber-300">42</strong> consecutive'],
  ['untouchable 1984 season', 'untouchable <strong className="!text-sky-300">1984</strong> season'],
  ['<strong>Roger Federer</strong> put together a 41-match winning streak', '<span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> put together a <strong className="!text-amber-300">41</strong>-match winning streak'],
  ['between 2006 and 2007, at the heart', 'between <strong className="!text-sky-300">2006 and 2007</strong>, at the heart'],
  
  // Sezione 2: Grand Slams
  ['belongs to <strong>Novak Djokovic</strong>, with 30 consecutive wins at majors between Wimbledon 2015 and Wimbledon 2016', 'belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, with <strong className="!text-amber-300">30</strong> consecutive wins at majors between <strong className="!text-sky-300">Wimbledon 2015 and Wimbledon 2016</strong>'],
  ['Second is <strong>Rod Laver</strong>, with 29 straight Grand Slam wins from the 1969 Australian Open to Wimbledon 1970', 'Second is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href="/players/rod-laver" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rod Laver</Link></span>, with <strong className="!text-amber-300">29</strong> straight Grand Slam wins from the <strong className="!text-sky-300">1969</strong> Australian Open to <strong className="!text-sky-300">Wimbledon 1970</strong>'],
  ['Third is <strong>Roger Federer</strong>, with 27 consecutive Grand Slam wins between Wimbledon 2005 and Roland Garros 2006', 'Third is <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, with <strong className="!text-amber-300">27</strong> consecutive Grand Slam wins between <strong className="!text-sky-300">Wimbledon 2005 and Roland Garros 2006</strong>'],
  ['Behind them, <strong>Jimmy Connors</strong>, <strong>Rafael Nadal</strong> and <strong>Pete Sampras</strong> are tied at 25 consecutive', 'Behind them, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/jimmy-connors" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/rafael-nadal" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/pete-sampras" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Pete Sampras</Link></span> are tied at <strong className="!text-amber-300">25</strong> consecutive'],
  ['Djokovic at 30, followed by Laver at 29, Federer at 27, and the group of Connors, Nadal and Sampras at 25', 'Djokovic at <strong className="!text-amber-300">30</strong>, followed by Laver at <strong className="!text-amber-300">29</strong>, Federer at <strong className="!text-amber-300">27</strong>, and the group of Connors, Nadal and Sampras at <strong className="!text-amber-300">25</strong>'],
  
  // Sezione 3: Grass
  ['belongs to <strong>Roger Federer</strong>, with 65 consecutive wins between Halle 2003 and Wimbledon 2008', 'belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, with <strong className="!text-amber-300">65</strong> consecutive wins between <strong className="!text-sky-300">Halle 2003 and Wimbledon 2008</strong>'],
  ['Second is <strong>Björn Borg</strong>, with 41 straight wins on grass from Wimbledon 1976 to Wimbledon 1981', 'Second is <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><Link href="/players/bjorn-borg" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Björn Borg</Link></span>, with <strong className="!text-amber-300">41</strong> straight wins on grass from <strong className="!text-sky-300">Wimbledon 1976 to Wimbledon 1981</strong>'],
  ['All 41 wins came at Wimbledon', 'All <strong className="!text-amber-300">41</strong> wins came at Wimbledon'],
  ['Third is <strong>Novak Djokovic</strong>, with 34 consecutive grass-court wins from Wimbledon 2018 to Wimbledon 2023', 'Third is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, with <strong className="!text-amber-300">34</strong> consecutive grass-court wins from <strong className="!text-sky-300">Wimbledon 2018 to Wimbledon 2023</strong>'],
  ['Fourth is <strong>Rod Laver</strong>, with 24 straight wins on grass between 1969 and 1970', 'Fourth is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href="/players/rod-laver" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rod Laver</Link></span>, with <strong className="!text-amber-300">24</strong> straight wins on grass between <strong className="!text-sky-300">1969 and 1970</strong>'],
  ['at 65, followed by Borg at 41, Djokovic at 34 and Laver at 24', 'at <strong className="!text-amber-300">65</strong>, followed by Borg at <strong className="!text-amber-300">41</strong>, Djokovic at <strong className="!text-amber-300">34</strong> and Laver at <strong className="!text-amber-300">24</strong>'],
];

for (const [old, newStr] of replacements) {
  if (content.includes(old)) {
    content = content.replace(old, newStr);
  } else {
    console.warn(`⚠️  Not found: "${old.substring(0, 50)}..."`);
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ File updated successfully with proper UTF-8 encoding!');
