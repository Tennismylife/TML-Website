#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');
const pidFile = path.join(root, '.next', 'standalone_server.pid');

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
console.log('Starting standalone server (detached) at', serverPath);

const child = spawn(process.execPath, [serverPath], {
  cwd: serverDir,
  detached: true,
  stdio: 'ignore',
});

child.unref();
fs.writeFileSync(pidFile, String(child.pid), 'utf-8');
console.log('Started detached server with pid', child.pid);
console.log('PID file:', pidFile);
