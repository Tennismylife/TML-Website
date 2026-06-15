#!/usr/bin/env node
const fs = require('fs');

const filePath = 'app/records/Streak/WinsSection.tsx';

// Read with UTF-8 explicitly
const content = fs.readFileSync(filePath, 'utf8');

// Write back clean UTF-8
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ File repaired with proper UTF-8 encoding');
