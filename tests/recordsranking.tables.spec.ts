import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const res = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(res));
    else if (/page\.(tsx|jsx|ts|js)$/.test(e.name)) files.push(res);
  }
  return files;
}

test('every recordsranking page includes a <table> element in source', () => {
  const root = path.join(process.cwd(), 'app', 'recordsranking');
  if (!fs.existsSync(root)) return;
  const pages = walk(root);
  // Exclude wrapper pages that import sub-pages (e.g. import X from "./Y/page") — we only validate "leaf" pages
  const leafPages = pages.filter((p) => {
    const content = fs.readFileSync(p, 'utf8');
    // If this page imports another local page implementation, it's a wrapper
    const importsLocalPage = /from\s+['"]\.[^'\"]*\/page['"]/m.test(content);
    return !importsLocalPage;
  });

  const missing: string[] = [];
  for (const p of leafPages) {
    const content = fs.readFileSync(p, 'utf8');
    if (!/<\s*table\b/i.test(content)) {
      missing.push(path.relative(process.cwd(), p));
    }
  }

  expect(missing, `Leaf pages missing explicit <table>:\n${missing.join('\n')}`).toEqual([]);
});