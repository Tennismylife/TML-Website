const fs = require('fs')
const path = require('path')
const ttf2woff2 = require('ttf2woff2').default || require('ttf2woff2')

const fontsDir = path.join(__dirname, '..', 'public', 'fonts')
if (!fs.existsSync(fontsDir)) {
  console.error('No fonts directory found at', fontsDir)
  process.exit(1)
}

const files = fs.readdirSync(fontsDir).filter(f => f.endsWith('.ttf'))
if (!files.length) {
  console.log('No .ttf files found in', fontsDir)
  process.exit(0)
}

for (const f of files) {
  const ttfPath = path.join(fontsDir, f)
  const base = path.basename(f, '.ttf')
  const woff2Path = path.join(fontsDir, base + '.woff2')
  if (fs.existsSync(woff2Path)) {
    console.log(`Skipping ${base}.woff2 (already exists)`)
    continue
  }
  try {
    const ttf = fs.readFileSync(ttfPath)
    const woff2 = ttf2woff2(ttf)
    fs.writeFileSync(woff2Path, woff2)
    console.log(`Wrote ${woff2Path}`)
  } catch (err) {
    console.error('Failed to convert', ttfPath, err)
  }
}

console.log('Done.')
