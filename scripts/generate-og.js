const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public', 'og', 'site-preview.svg');
const pngPath = path.join(root, 'public', 'og', 'site-preview.png');

if (!fs.existsSync(svgPath)) {
  console.error('SVG not found:', svgPath);
  process.exit(1);
}

// Inline logo (reuses existing script)
try {
  execSync(`node "${path.join(__dirname, 'inline-logo.js')}"`, { stdio: 'inherit' });
} catch (err) {
  console.warn('inline-logo.js failed (continuing):', err.message);
}

(async () => {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
      .resize(1200, 630, { fit: 'contain' })
      .png({ quality: 90 })
      .toFile(pngPath);
    console.log('Generated', pngPath);
  } catch (err) {
    console.error('Error generating PNG:', err);
    process.exit(1);
  }
})();
