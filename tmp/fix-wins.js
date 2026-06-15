const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'records', 'Wins', 'Wins.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find and remove the Djokovic/Sinner paragraph
// The paragraph starts with "          <p>\n            Djokovic" and ends before "          <p>\n            Behind"
const regex = /\s+<p>\s*\n\s+Djokovic[^<]*chase is still active[\s\S]*?\[atptour\.com\], \[espn\.com\]\s*\n\s+<\/p>/;

const match = content.match(regex);
if (match) {
  console.log('Found paragraph:', match[0].substring(0, 100) + '...');
  content = content.replace(regex, '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Done! Paragraph removed.');
} else {
  console.log('Paragraph not found. Searching for Sinner...');
  const idx = content.indexOf('Sinner');
  if (idx > -1) {
    console.log('Context around Sinner:', content.substring(idx - 50, idx + 200));
  }
}
