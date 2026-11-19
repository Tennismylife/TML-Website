import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
const { listPublicCsvFiles } = require('../../../lib/public-csv-files.cjs') as { listPublicCsvFiles: (dir: string) => string[] };

export async function GET(request: Request) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ error: 'data directory not found' }, { status: 404 });
    }

    const files = listPublicCsvFiles(dataDir);

    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;

    const results = files.map((name) => {
      const st = fs.statSync(path.join(dataDir, ...name.split('/')));
      return { name, url: `${base}/data/${name.split('/').map(encodeURIComponent).join('/')}`, size: st.size, mtime: st.mtime.toISOString() };
    });

    return NextResponse.json({ count: results.length, files: results });
  } catch (err) {
    console.error('Error listing data files', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
