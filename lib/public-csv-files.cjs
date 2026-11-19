'use strict';
const fs = require('fs');
const path = require('path');

// Only published match datasets are eligible for the public catalog and ZIP.
// Never walk audit, backup, staging or other support directories.
const ROOT_PUBLIC_CSV = /^(?:[0-9]{4}(?:_challenger|_wta)?|ATP_Database|atp_matches_amateur|ongoing_tourneys|challenger_ongoing_tourneys|wta_ongoing_tourneys)\.csv$/i;
const QUALI_PUBLIC_CSV = /^[0-9]{4}_atp_quali\.csv$/i;

function listPublicCsvFiles(dataDir) {
  const files = [];
  for (const item of fs.readdirSync(dataDir, { withFileTypes: true })) {
    if (item.isFile() && ROOT_PUBLIC_CSV.test(item.name)) files.push(item.name);
  }

  const qualiDir = path.join(dataDir, 'atp_quali');
  if (fs.existsSync(qualiDir) && fs.statSync(qualiDir).isDirectory()) {
    for (const item of fs.readdirSync(qualiDir, { withFileTypes: true })) {
      if (item.isFile() && QUALI_PUBLIC_CSV.test(item.name)) {
        files.push('atp_quali/' + item.name);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

module.exports = { listPublicCsvFiles };
