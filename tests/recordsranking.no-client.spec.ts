import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const res = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(res));
    else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) files.push(res);
  }
  return files;
}

test('no "use client" or next/navigation hooks in app/recordsranking', () => {
  const root = path.join(process.cwd(), 'app', 'recordsranking');
  if (!fs.existsSync(root)) return;
  const files = walk(root);
  const offenders: string[] = [];

  const useClientRe = /^\s*["']use client["'];/m;
  const nextNavRe = /from\s+['"]next\/navigation['"]/m;

  const allowedClientPatterns = [/Controls\.tsx$/, /Dropdown.*\.tsx$/, /Selector.*\.tsx$/];

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split(/\r?\n/);

    if (useClientRe.test(content)) {
      // allow small client-only selector components (Controls, Dropdown, Selector)
      const basename = path.basename(f);
      const isAllowed = allowedClientPatterns.some(p => p.test(basename));
      if (isAllowed) continue;
      const lineIdx = lines.findIndex(l => useClientRe.test(l));
      offenders.push(`${path.relative(process.cwd(), f)}: 'use client' at line ${lineIdx + 1}`);
      continue;
    }

    if (nextNavRe.test(content)) {
      const lineIdx = lines.findIndex(l => nextNavRe.test(l));
      offenders.push(`${path.relative(process.cwd(), f)}: next/navigation import at line ${lineIdx + 1}`);
    }
  }

  if (offenders.length > 0) {
    // present a helpful message
    expect(offenders.join('\n')).toEqual('');
  }
});