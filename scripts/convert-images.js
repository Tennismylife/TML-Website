const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.resolve(__dirname, '..', 'public');
const sources = [
  { name: 'UnderCostruction', ext: 'png' },
];

(async () => {
  for (const s of sources) {
    const srcPath = path.join(publicDir, `${s.name}.${s.ext}`);
    if (!fs.existsSync(srcPath)) {
      console.error('Source not found:', srcPath);
      continue;
    }

    const outAvif = path.join(publicDir, `${s.name}.avif`);
    const outAvif480 = path.join(publicDir, `${s.name}-480.avif`);
    const outAvif320 = path.join(publicDir, `${s.name}-320.avif`);
    const outWebp = path.join(publicDir, `${s.name}.webp`);

    try {
      // Full-size AVIF (reasonable quality)
      await sharp(srcPath)
        .avif({ quality: 50, effort: 4 })
        .toFile(outAvif);
      console.log('Written', outAvif);
    } catch (err) {
      console.error('Failed to write AVIF for', srcPath, err && err.message);
    }

    try {
      // Mobile-focused variants: smaller width + slightly lower quality to save bytes
      await sharp(srcPath)
        .resize({ width: 480 })
        .avif({ quality: 45, effort: 6 })
        .toFile(outAvif480);
      console.log('Written', outAvif480);
    } catch (err) {
      console.error('Failed to write AVIF 480 for', srcPath, err && err.message);
    }

    try {
      await sharp(srcPath)
        .resize({ width: 320 })
        .avif({ quality: 40, effort: 6 })
        .toFile(outAvif320);
      console.log('Written', outAvif320);
    } catch (err) {
      console.error('Failed to write AVIF 320 for', srcPath, err && err.message);
    }

    try {
      await sharp(srcPath)
        .webp({ quality: 70 })
        .toFile(outWebp);
      console.log('Written', outWebp);
    } catch (err) {
      console.error('Failed to write WebP for', srcPath, err && err.message);
    }
  }
})();