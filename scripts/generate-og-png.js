const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  const sharp = require('sharp');
  const svgPath = 'preview.svg';
  const pngPath = 'preview.png';

  if (!fs.existsSync(svgPath)) {
    console.log(`${svgPath} not found, generating it first...`);
    try {
      execSync('node scripts/generate-og-svg.js', { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to generate SVG:', e);
      process.exit(1);
    }
  }

  try {
    await sharp(svgPath)
      .resize(1200, 630)
      .png({ quality: 90 })
      .toFile(pngPath);
    console.log(`Wrote ${pngPath}`);

    // Open the file on Windows
    if (process.platform === 'win32') {
      execSync(`start ${pngPath}`);
    } else if (process.platform === 'darwin') {
      execSync(`open ${pngPath}`);
    } else {
      console.log(`PNG saved at ${pngPath}. Open it with your image viewer.`);
    }
  } catch (err) {
    console.error('Error generating PNG:', err);
    process.exit(1);
  }
}

main();