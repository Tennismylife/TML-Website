const fs = require('fs');
const path = require('path');
const Fontmin = require('fontmin');

// If a glyphs file exists (scripts/glyphs.txt), use it; otherwise use Latin-1 range
function loadGlyphs() {
  const glyphsPath = path.join(__dirname, 'glyphs.txt');
  if (fs.existsSync(glyphsPath)) {
    try {
      return fs.readFileSync(glyphsPath, 'utf8');
    } catch (e) {
      // fallback
    }
  }
  let chars = '';
  for (let cp = 0x0020; cp <= 0x00FF; cp++) {
    chars += String.fromCharCode(cp);
  }
  return chars;
}

async function subsetFont(ttfPath) {
  return new Promise((resolve, reject) => {
    const basename = path.basename(ttfPath, path.extname(ttfPath));
    const glyphs = loadGlyphs();
    const fm = new Fontmin()
      .src(ttfPath)
      .use(Fontmin.glyph({ text: glyphs }))
      .dest(path.dirname(ttfPath));

    fm.run(function (err, files) {
      if (err) return reject(err);
      // Fontmin writes a subset .ttf with the original basename; rename to suffix -subset.ttf
      const produced = files.find((f) => f.path && f.path.endsWith('.ttf'));
      if (!produced) return reject(new Error('No subset .ttf produced'));

      const producedPath = path.join(path.dirname(ttfPath), path.basename(produced.path));
      const desiredTtfPath = path.join(path.dirname(ttfPath), `${basename}-subset.ttf`);

      try {
        if (producedPath !== desiredTtfPath) {
          fs.renameSync(producedPath, desiredTtfPath);
        }
        console.log(`Wrote ${desiredTtfPath}`);
        resolve(desiredTtfPath);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function main() {
  const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
  if (!fs.existsSync(fontsDir)) {
    console.error('public/fonts directory not found. Run fetch-fonts/build-fonts first.');
    process.exit(1);
  }

  const files = fs.readdirSync(fontsDir).filter((f) => f.endsWith('.ttf') && !f.endsWith('-subset.ttf'));
  if (files.length === 0) {
    console.error('No source .ttf files found in public/fonts (or only -subset.ttf files are present).');
    process.exit(1);
  }

  console.log(`Found ${files.length} source .ttf files. Subsetting using gathered glyphs and producing -subset.ttf files...`);

  for (const f of files) {
    const full = path.join(fontsDir, f);
    try {
      await subsetFont(full);
    } catch (err) {
      console.error(`Failed to subset ${f}:`, err);
      process.exitCode = 2;
    }
  }

  console.log('\nDone. Subsetted fonts written to public/fonts with -subset.woff2 suffix. Update your CSS and preloads to use them.');
}

main();
