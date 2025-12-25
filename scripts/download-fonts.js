const https = require('https')
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'public', 'fonts')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const fonts = [
  { family: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap' },
  { family: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap' },
]

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) return reject(new Error(`Status ${res.statusCode}`))
      let data = ''
      res.on('data', d => (data += d))
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error(`Failed to download ${url} (${res.statusCode})`))
      const file = fs.createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', reject)
    }).on('error', reject)
  })
}

;(async () => {
  try {
    for (const f of fonts) {
      console.log(`Fetching CSS for ${f.family}...`)
      const css = await fetchText(f.url)
      const blocks = css.match(/@font-face\s*{[^}]*}/g) || []
      console.log(`  Found ${blocks.length} @font-face blocks`)
      for (const block of blocks) {
        console.log('    block raw:', block.replace(/\n/g, ' ').slice(0, 200) + '...')
        const weightMatch = block.match(/font-weight:\s*([0-9]+)\s*;/i)
        const urlMatch = block.match(/src:\s*url\(([^)]+)\)/i)
        const styleMatch = block.match(/font-style:\s*([^;]+)\s*;/i)
        const weight = (weightMatch && weightMatch[1]) || '400'
        console.log('    block weight:', weight, 'hasUrl?', !!urlMatch)
        if (!urlMatch) continue
        // Remove quotes
        let url = urlMatch[1].trim().replace(/^\s*"|"\s*$|^\s*'|'\s*$/g, '')
        if (url.startsWith('//')) url = 'https:' + url
        // Fetch to detect content-type and pick extension
        console.log(`    Resolving ${url} ...`)
        const ext = await new Promise((resolve, reject) => {
          https.get(url, res => {
            const ct = (res.headers['content-type'] || '').toLowerCase()
            res.destroy()
            if (ct.includes('woff2')) return resolve('woff2')
            if (ct.includes('ttf') || ct.includes('truetype')) return resolve('ttf')
            if (ct.includes('opentype') || ct.includes('otf')) return resolve('otf')
            // fallback based on url path
            const p = new URL(url).pathname
            if (p.endsWith('.woff2')) return resolve('woff2')
            if (p.endsWith('.ttf')) return resolve('ttf')
            if (p.endsWith('.otf')) return resolve('otf')
            resolve('bin')
          }).on('error', reject)
        })
        const filename = `${f.family.replace(/\s+/g, '')}-latin-${weight}.${ext}`
        const dest = path.join(outDir, filename)
        if (fs.existsSync(dest)) {
          console.log(`  Skipping ${filename} (already exists)`)
          continue
        }
        console.log(`  Downloading weight ${weight} → ${filename} from ${url}`)
        await downloadFile(url, dest)
        console.log(`  Wrote ${dest}`)
      }
    }
    console.log('\nDone. Fonts are in public/fonts/. Next: add @font-face to your CSS and preload links in app/layout.tsx')
  } catch (err) {
    console.error('Error fetching fonts:', err)
    process.exit(1)
  }
})()
