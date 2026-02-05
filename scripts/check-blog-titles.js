const fs = require('fs');
const path = require('path');
const BLOG = path.join(process.cwd(), 'content', 'blog');
const files = fs.readdirSync(BLOG).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
for (const f of files) {
  const s = fs.readFileSync(path.join(BLOG, f), 'utf8');
  const idx = s.indexOf('\n---', 3);
  const fm = s.slice(3, idx).trim();
  const m = {};
  console.log('frontmatter raw:\n', fm);
  for (const [i, line] of fm.split(/\n/).entries()) {
    console.log('line', i, JSON.stringify(line));
    const mm = line.match(/^([\w-]+):\s*(.*)$/);
    console.log('mm', !!mm);
    if (mm) {
      const key = mm[1];
      let raw = mm[2].trim();
      if (/^(true|false)$/i.test(raw)) m[key] = raw.toLowerCase() === 'true';
      else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) m[key] = raw.replace(/^"|"$/g, '');
      else if (/^\[.*\]$/.test(raw)) m[key] = raw.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      else m[key] = raw.replace(/^"|"$/g, '');
    }
  }
  console.log(f, '->', m.title);
}
