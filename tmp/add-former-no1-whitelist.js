const fs = require('fs');
const path = require('path');
const filePath = path.join(process.cwd(), 'public', 'players-surface-whitelist.json');
const exNo1Slugs = [
  'ilie-nastase',
  'jimmy-connors',
  'bjorn-borg',
  'john-mcenroe',
  'ivan-lendl',
  'boris-becker',
  'stefan-edberg',
  'mats-wilander',
  'pete-sampras',
  'jim-courier',
  'andre-agassi',
  'patrick-rafter',
  'marat-safin',
  'yevgeny-kafelnikov',
  'lleyton-hewitt',
  'roger-federer',
  'andy-roddick',
  'thomas-muster',
  'andy-murray',
  'rafael-nadal',
  'novak-djokovic',
  'carlos-alcaraz',
  'daniil-medvedev',
  'alexander-zverev',
  'carlos-moya',
  'juan-carlos-ferrero'
];

const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);
const currentSlugs = new Set((data.slugs || []).map(s => String(s).toLowerCase()));
const manual = new Set((data.manualAllowlist || []).map(s => String(s).toLowerCase()));
let added = 0;
for (const slug of exNo1Slugs) {
  if (!currentSlugs.has(slug)) {
    currentSlugs.add(slug);
    added += 1;
  }
  if (!manual.has(slug)) {
    manual.add(slug);
  }
}

const updatedSlugs = Array.from(currentSlugs).sort();
const updatedManual = Array.from(manual).sort();
const updatedSurfacePages = updatedSlugs.flatMap(slug => [
  `/players/${slug}/clay`,
  `/players/${slug}/hard`,
  `/players/${slug}/grass`,
]);

const updated = {
  ...data,
  manualAllowlist: updatedManual,
  totalSlugs: updatedSlugs.length,
  slugs: updatedSlugs,
  surfacePages: updatedSurfacePages,
};

fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
console.log('Added', added, 'new ex-No1 slugs. totalSlugs', updatedSlugs.length);