import fs from 'fs';
const path = 'lib/seo/records-policy.ts';
const text = fs.readFileSync(path, 'utf8');
const lines = text.split(/\r?\n/);
let currentSection = 'Global';
const sections = new Map();
for (const line of lines) {
  const sectionMatch = line.match(/^\s*\/\/ ---\s*(.*?)\s*-{3,}/);
  if (sectionMatch) {
    currentSection = sectionMatch[1].trim();
    sections.set(currentSection, []);
    continue;
  }
  const titleMatch = line.match(/title:\s*'([^']*)'/);
  if (titleMatch) {
    if (!sections.has(currentSection)) sections.set(currentSection, []);
    sections.get(currentSection).push(titleMatch[1]);
  }
}
for (const [section, titles] of sections) {
  console.log(`=== ${section} (${titles.length}) ===`);
  for (const title of titles) console.log(title);
  console.log('');
}
console.log('TOTAL', Array.from(sections.values()).reduce((sum, arr) => sum + arr.length, 0));
