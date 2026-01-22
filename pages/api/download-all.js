const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

export default async function handler(req, res) {
  console.log('/api/download-all handler hit');
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      res.statusCode = 404;
      res.end('data directory not found');
      return;
    }

    // Optional query parameter `files=name1.csv,name2.csv` to include a subset
    const requested = req.query.files ? req.query.files.toString().split(',').map((s) => s.trim()).filter(Boolean) : null;

    let files = fs.readdirSync(dataDir).filter((f) => /\.csv$/i.test(f));
    if (requested && requested.length) {
      files = files.filter((f) => requested.includes(f));
    }

    if (files.length === 0) {
      res.statusCode = 404;
      res.end('No CSV files to include in ZIP');
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="tml-data.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archive error', err);
      if (!res.headersSent) res.statusCode = 500;
      try { res.end(); } catch (e) { /* ignore */ }
    });

    // Pipe archive data to the response
    archive.pipe(res);

    for (const f of files) {
      const p = path.join(dataDir, f);
      archive.file(p, { name: f });
    }

    archive.finalize();
  } catch (err) {
    console.error('Error in /api/download-all (pages API)', err);
    if (!res.headersSent) res.statusCode = 500;
    res.end('Internal server error creating ZIP');
  }
};