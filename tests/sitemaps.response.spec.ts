import { describe, it, expect } from 'vitest';
import { sendXmlStream } from '@/src/sitemaps/response';

async function* smallGen() {
  yield '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  yield '  <url>\n    <loc>https://example.org/</loc>\n  </url>\n';
  yield '</urlset>';
}

describe('sendXmlStream', () => {
  it('returns gzip when accepted and sets ETag', async () => {
    const req: any = { headers: { 'accept-encoding': 'gzip' } };
    const res: any = {
      headers: {} as Record<string,string>,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      writeChunks: [] as Buffer[],
      write(buf: Buffer) { this.writeChunks.push(Buffer.isBuffer(buf) ? buf : Buffer.from(buf)); },
      end() { this.ended = true; }
    } as any;

    await sendXmlStream(req, res, smallGen(), { cacheSec: 60 });
    expect(res.headers['Content-Encoding']).toBe('gzip');
    expect(res.headers['ETag']).toBeDefined();
    expect(res.headers['Content-Length']).toBeDefined();
    // decompress and check content contains loc
    const zlib = await import('zlib');
    const gz = Buffer.concat(res.writeChunks);
    const out = zlib.gunzipSync(gz).toString('utf8');
    expect(out).toContain('<loc>https://example.org/</loc>');
  });

  it('responds 304 when If-None-Match matches', async () => {
    const req1: any = { headers: { 'accept-encoding': 'gzip' } };
    const res1: any = { headers: {}, setHeader(k:string,v:string){ this.headers[k]=v; }, writeChunks: [], write(buf: Buffer){ this.writeChunks.push(Buffer.isBuffer(buf)?buf:Buffer.from(buf)); }, end(){ this.ended=true; } } as any;
    await sendXmlStream(req1, res1, smallGen(), { cacheSec: 60 });
    const etag = res1.headers['ETag'];

    const req2: any = { headers: { 'if-none-match': etag } };
    let status = 200;
    const res2: any = { setHeader() {}, end(){ this.ended=true; }, statusCode: 200, status(code:number){ this.statusCode = code; return this; } } as any;

    await sendXmlStream(req2, res2, smallGen(), { cacheSec: 60 });
    expect(res2.statusCode).toBe(304);
  });
});