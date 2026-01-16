import { NextResponse } from 'next/server';
import { generateSitemapXml } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Short-circuit during build when SKIP_SITEMAP_BUILD=1 to avoid long DB operations
    if (process.env.SKIP_SITEMAP_BUILD === '1') {
      const base = process.env.SITE_URL || 'https://stats.tennismylife.org';
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${base}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.00</priority>\n  </url>\n</urlset>`;
      return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    const xml = await generateSitemapXml();
    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
    });
  } catch (e: any) {
    console.error('Failed to generate sitemap:', e);
    return new NextResponse(JSON.stringify({ error: e?.message || 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
