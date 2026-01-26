import { xmlHeaderUrlset, xmlFooterUrlset } from './xml';
import zlib from 'zlib';
import crypto from 'crypto';

export async function sendXmlStream(req: any, res: any, generator: AsyncGenerator<string>, opts: { cacheSec?: number } = {}) {
  // Collect contents to compute ETag (strong) and optionally gzip
  const chunks: Buffer[] = [];
  for await (const part of generator) {
    chunks.push(Buffer.from(part, 'utf8'));
  }
  const full = Buffer.concat(chunks);
  const etag = '"' + crypto.createHash('sha1').update(full).digest('hex') + '"';

  // Handle If-None-Match
  if (req.headers['if-none-match'] && req.headers['if-none-match'] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }

  // Check gzip
  const accept = String(req.headers['accept-encoding'] || req.headers['accept'] || '');
  const useGzip = accept.includes('gzip');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('ETag', etag);
  if (typeof opts.cacheSec === 'number') res.setHeader('Cache-Control', `public, max-age=${Number(opts.cacheSec)}`);
  if (useGzip) {
    res.setHeader('Content-Encoding', 'gzip');
    const gz = zlib.gzipSync(full, { level: 6 });
    res.setHeader('Content-Length', gz.length.toString());
    res.write(gz);
    res.end();
    return;
  }

  res.setHeader('Content-Length', full.length.toString());
  res.write(full);
  res.end();
}
