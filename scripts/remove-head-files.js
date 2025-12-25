const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let removed = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name === 'head.tsx') {
      try {
        fs.unlinkSync(full);
        removed.push(full);
      } catch (err) {
        console.error('Failed to remove', full, err && err.message ? err.message : err);
      }
    }
  }
}

console.log('Searching for app/**/head.tsx files under', root);
walk(path.join(root, 'app'));
if (!removed.length) {
  console.log('No head.tsx files found to remove.');
} else {
  console.log('Removed files:');
  removed.forEach((f) => console.log('-', f));
}
