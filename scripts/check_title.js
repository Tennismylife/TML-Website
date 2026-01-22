const fs = require('fs');
const path = require('path');

const root = process.cwd();

function checkHead() {
  const headPath = path.join(root, 'app', 'tennis-match-database', 'head.tsx');
  const content = fs.readFileSync(headPath, 'utf8');
  const expected1 = 'TennisMyLife – Complete Match Database &amp; Stats';
  const expected2 = 'TennisMyLife – Complete Match Database & Stats';
  if (content.includes(expected1) || content.includes(expected2)) {
    console.log('PASS: head.tsx contains expected title string');
    return true;
  } else {
    console.error('FAIL: head.tsx does NOT contain expected title string');
    return false;
  }
}

function checkLayout() {
  const layoutPath = path.join(root, 'app', 'layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  const unexpected = 'TML — Tennis Records Data History Rankings, Matches & GOAT';
  if (!content.includes(unexpected)) {
    console.log('PASS: layout.tsx does not contain legacy siteTitle string');
    return true;
  } else {
    console.error('WARN: layout.tsx still contains legacy siteTitle string');
    return false;
  }
}

let ok = true;
ok = checkHead() && ok;
ok = checkLayout() && ok;
process.exit(ok ? 0 : 2);
