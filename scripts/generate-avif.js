#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const input = path.resolve(__dirname, '..', 'public', 'header.jpg');
const output = path.resolve(__dirname, '..', 'public', 'header-480.avif');

async function run() {
  if (!fs.existsSync(input)) {
    console.error('Source image not found:', input);
    process.exit(2);
  }
  try {
    await sharp(input)
      .resize({ width: 480 })
      .avif({ quality: 60 })
      .toFile(output);
    console.log('Generated:', output);
  } catch (e) {
    console.error('Generation failed:', e);
    process.exit(1);
  }
}

run();
