const fs = require('fs');
const path = require('path');

const H2 = '<caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">All-time leaderboard</caption>';
const TABLE_OPEN = '<table className="min-w-full border-collapse">';
const THEAD = '<thead>';

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.name === 'page.tsx') {
      let c = fs.readFileSync(full, 'utf8');
      const hasCRLF = c.includes('\r\n');

      // Normalize to LF for processing
      let normalized = c.replace(/\r\n/g, '\n');

      // Already done?
      if (normalized.includes(H2)) {
        console.log('Already done:', full);
        continue;
      }

      // Find the first <table className="min-w-full border-collapse"> followed by a line with <thead>
      const tablePattern = /<table className="min-w-full border-collapse">\n(\s*)<thead>/;
      if (tablePattern.test(normalized)) {
        const newContent = normalized.replace(tablePattern, (match, indent) => {
          return `${TABLE_OPEN}\n${indent}${H2}\n${indent}${THEAD}`;
        });
        // Restore CRLF if original had it
        const finalContent = hasCRLF ? newContent.replace(/\n/g, '\r\n') : newContent;
        fs.writeFileSync(full, finalContent, 'utf8');
        console.log('Updated:', full);
      } else {
        console.log('Pattern not found:', full);
      }
    }
  }
}

walk('app/recordsranking');
console.log('Done');
