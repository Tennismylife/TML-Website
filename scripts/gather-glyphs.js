const fs = require('fs');
const path = require('path');

// Scan source files for visible characters and write them to scripts/glyphs.txt
const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'public'];
const EXT = ['.tsx', '.ts', '.jsx', '.js', '.html', '.md', '.mdx'];

function walk(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...walk(full));
    } else if (EXT.includes(path.extname(e.name))) {
      files.push(full);
    }
  }
  return files;
}

function extractText(content) {
  // Remove JSX/HTML tags and JS expressions between braces
  let s = content.replace(/<[^>]+>/g, ' ');
  s = s.replace(/\{[^}]*\}/g, ' ');
  // Remove import/export lines
  s = s.replace(/^(import|export)[^\n]*$/gm, ' ');
  // Remove URLs and email-like tokens
  s = s.replace(/https?:\/\/[\S]+/g, ' ');
  // Keep punctuation and letters; collapse whitespace
  return s;
}

function uniqueChars(str) {
  const set = new Set();
  for (const ch of str) set.add(ch);
  return Array.from(set).filter(c => c.trim().length > 0 || c === ' ');
}

function main() {
  const charsSet = new Set();
  for (const d of SCAN_DIRS) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    const files = walk(dir);
    for (const f of files) {
      try {
        const content = fs.readFileSync(f, 'utf8');
        const text = extractText(content);
        for (const ch of text) charsSet.add(ch);
      } catch (e) {
        // ignore unreadable files
      }
    }
  }

  // Ensure basic space and digits/letters are present
  const guarantee = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:-_!?%()[]{}\"\'`' + "'\n\r" + ' ';
  for (const c of guarantee) charsSet.add(c);

  const chars = Array.from(charsSet).join('');
  const outPath = path.join(__dirname, 'glyphs.txt');
  fs.writeFileSync(outPath, chars, 'utf8');
  console.log(`Wrote ${outPath} with ${chars.length} unique characters.`);
}

main();
