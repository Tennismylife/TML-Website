#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const OUT_DIR = path.join(process.cwd(), 'public', 'blog', 'thumbs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { meta: {}, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: content };
  const fm = content.slice(3, end).trim();
  const body = content.slice(end + 4).trim();
  const meta = {};
  for (const line of fm.split(/\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      const key = m[1].trim();
      let val = m[2].trim();
      meta[key] = val.replace(/^"|"$/g, '');
    }
  }
  return { meta, body };
}

function svgForPost(title, date) {
  const titleEsc = String(title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dateEsc = String(date || '');
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#0f1720"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)" />
  <text x="48" y="140" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'" font-size="44" fill="#fff" font-weight="700">Tennis My Life</text>
  <text x="48" y="220" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'" font-size="40" fill="#e5e7eb" font-weight="600">${titleEsc}</text>
  <text x="48" y="560" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'" font-size="20" fill="#9ca3af">${dateEsc}</text>
</svg>`;
}

async function build() {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  for (const file of files) {
    const slug = file.replace(/\.(md|mdx)$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const { meta } = parseFrontmatter(raw);
    const title = meta.title || slug;
    const date = meta.date || '';
    const svg = svgForPost(title, date);
    const svgPath = path.join(OUT_DIR, `${slug}.svg`);
    fs.writeFileSync(svgPath, svg, 'utf8');

    // If frontmatter specifies a thumbnail file under public, use it to compose a PNG thumb
    const thumbSrc = meta.thumbnail && meta.thumbnail.replace(/^\//, ''); // e.g. 'blog/img/alcaraz-...jpg'
    const pngPath = path.join(OUT_DIR, `${slug}.png`);
    if (thumbSrc && fs.existsSync(path.join(process.cwd(), 'public', thumbSrc))) {
      try {
        await sharp(path.join(process.cwd(), 'public', thumbSrc))
          .resize(1200, 630, { fit: 'cover' })
          .png({ quality: 80 })
          .toFile(pngPath);
        console.log('Wrote thumbnail from source image', pngPath);
        continue;
      } catch (e) {
        console.error('Failed to generate thumbnail from source for', slug, e.message || e);
      }
    }

    // fallback: render PNG from SVG
    try {
      const buffer = Buffer.from(svg);
      await sharp(buffer).png({ quality: 80 }).toFile(pngPath);
      console.log('Wrote', pngPath);
    } catch (e) {
      console.error('Failed to generate PNG for', slug, e.message || e);
    }
  }
}

build().catch(err => { console.error(err); process.exit(1); });
