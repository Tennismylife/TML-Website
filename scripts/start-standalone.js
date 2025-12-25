#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');

function findServerJs(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && e.name === 'server.js') return full;
    if (e.isDirectory()) {
      const found = findServerJs(full);
      if (found) return found;
    }
  }
  return null;
}

const serverPath = findServerJs(standaloneDir);
if (!serverPath) {
  console.error('Could not find server.js under .next/standalone. Did you run `next build`?');
  process.exit(1);
}

const serverDir = path.dirname(serverPath);
console.log('Starting standalone server at', serverPath);

const child = spawn(process.execPath, [serverPath], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => process.exit(code));
child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
