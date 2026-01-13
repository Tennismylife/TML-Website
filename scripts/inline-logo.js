const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const logoPath = path.join(root, 'public', 'logo.png');
const svgPath = path.join(root, 'public', 'og', 'site-preview.svg');

if (!fs.existsSync(logoPath)) {
  console.error('logo not found:', logoPath);
  process.exit(1);
}
if (!fs.existsSync(svgPath)) {
  console.error('svg not found:', svgPath);
  process.exit(1);
}

const b = fs.readFileSync(logoPath).toString('base64');
let svg = fs.readFileSync(svgPath, 'utf8');
const newHref = `href=\"data:image/png;base64,${b}\"`;
svg = svg.replace(/href=\"[^\"]*logo\.png\"/, newHref);
fs.writeFileSync(svgPath, svg, 'utf8');
console.log('Inlined logo into', svgPath);