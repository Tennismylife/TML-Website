import { NextResponse } from 'next/server';
import { generateSitemapXml } from '@/lib/sitemap';

export async function GET() {
  try {
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
