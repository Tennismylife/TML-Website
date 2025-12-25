const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function optimizeFavicon() {
  const src = path.join(__dirname, '..', 'app', 'favicon.ico');
  const dest = path.join(__dirname, '..', 'public', 'favicon.png');
  if (!fs.existsSync(src)) {
    console.warn('No app/favicon.ico found, skipping favicon optimization.');
    return;
  }
  try {
    await sharp(src)
      .resize(32, 32, { fit: 'cover' })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(dest);
    console.log(`Wrote optimized favicon → ${dest}`);
  } catch (err) {
    console.warn('Favicon ICO open failed, falling back to resizing logo.png:', err.message || err);
    // fallback: use public/logo.png if available
    const logo = path.join(__dirname, '..', 'public', 'logo.png');
    if (fs.existsSync(logo)) {
      try {
        await sharp(logo)
          .resize(32, 32, { fit: 'cover' })
          .png({ quality: 80, compressionLevel: 9 })
          .toFile(dest);
        console.log(`Wrote fallback favicon from logo → ${dest}`);
      } catch (e) {
        console.error('Fallback favicon creation failed:', e.message || e);
      }
    } else {
      console.error('No logo.png to fallback to for favicon. Please add a small favicon to app/favicon.ico or public/favicon.png');
    }
  }
}

async function optimizeLogo() {
  const src = path.join(__dirname, '..', 'public', 'logo.png');
  const dest = path.join(__dirname, '..', 'public', 'logo.webp');
  if (!fs.existsSync(src)) {
    console.warn('No public/logo.png found, skipping logo optimization.');
    return;
  }
  try {
    // Resize to width 140 keeping aspect ratio; try to produce a small webp
    await sharp(src)
      .resize(140)
      .webp({ quality: 75, effort: 6 })
      .toFile(dest);
    console.log(`Wrote optimized logo → ${dest}`);
  } catch (err) {
    console.error('Logo optimization failed:', err.message || err);
  }
}

async function main() {
  await ensureDir(path.join(__dirname, '..', 'public'));
  await optimizeFavicon();
  await optimizeLogo();
  console.log('Image optimization complete.');
}

main();
