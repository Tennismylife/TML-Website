const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const ogDir = path.join(__dirname, '..', 'public', 'og');
  if (!fs.existsSync(ogDir)) {
    console.error('OG dir not found:', ogDir);
    process.exit(1);
  }

  const files = fs.readdirSync(ogDir).filter(f => f.endsWith('.svg'));
  for (const f of files) {
    const svgPath = path.join(ogDir, f);
    const outName = f.replace(/\.svg$/, '.png');
    const outPath = path.join(ogDir, outName);

    console.log('Rendering', svgPath, '→', outPath);
    const svg = fs.readFileSync(svgPath);
    try {
      await sharp(svg)
        .png({ quality: 90 })
        .resize(1200, 630)
        .toFile(outPath);
      console.log('Wrote', outPath);
    } catch (err) {
      console.error('Error rendering', f, err);
    }
  }
}

generate().catch(err => { console.error(err); process.exit(1); });