#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const pidFile = path.join(root, '.next', 'standalone_server.pid');

if (!fs.existsSync(pidFile)) {
  console.error('PID file not found. Nothing to stop.');
  process.exit(1);
}

const pid = Number(fs.readFileSync(pidFile, 'utf-8').trim());
if (!pid) {
  console.error('Invalid PID file.');
  process.exit(1);
}

console.log('Stopping PID', pid);
try {
  // cross-platform: try taskkill (Windows) then kill
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F']);
  } else {
    process.kill(pid, 'SIGTERM');
  }
  fs.unlinkSync(pidFile);
  console.log('Stopped. PID file removed.');
} catch (e) {
  console.error('Error stopping process:', e.message || e);
  process.exit(1);
}
