import React from 'react';
import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(request: Request, context: any) {
  // long-lived cache for generated OG images (10 years)
  const CACHE_FOREVER = 'public, max-age=315360000, s-maxage=315360000, immutable';

  try {
    const params = await context?.params;
    const slug = params?.slug ? String(params.slug) : null;
    const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

    // support force regen via ?force=1 or ?refresh=1
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1' || url.searchParams.get('refresh') === '1';

    // path to persisted OG images
    const publicDir = path.join(process.cwd(), 'public', 'og');
    const filePath = slug ? path.join(publicDir, `${slug}.png`) : null;

    // serve cached file if present and not forced
    if (filePath && !force) {
      try {
        if (fs.existsSync(filePath)) {
          const data = await fs.promises.readFile(filePath);
          return new Response(Buffer.from(data), { headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE_FOREVER } });
        }
      } catch (e) {
        // ignore filesystem errors
      }
    }

    if (!slug) {
      // @ts-ignore
      return new (ImageResponse as any)(
        (
          <div style={{ width: '1200px', height: '630px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontSize: 48, fontWeight: 700, padding: 40, textAlign: 'center' }}>
            Invalid player
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    // Fetch player header
    let playerBody: any = null;
    try {
      const res = await fetch(`${site}/api/players/${encodeURIComponent(slug)}/header`, { next: { revalidate: 60 } });
      if (res.ok) playerBody = await res.json();
    } catch (e) {
      // ignore
    }

    const displayName = playerBody?.name ? String(playerBody.name) : humanizeName(slug);
    const human = humanizeName(displayName);

    // Build a simple player OG image
    // @ts-ignore
    const img = new (ImageResponse as any)(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '60px',
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg,#0f172a,#071029)',
            color: 'white',
            fontFamily: 'Arial, Helvetica, sans-serif',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1, textShadow: '0 8px 28px rgba(0,0,0,0.6)' }}>{human}</div>
              <div style={{ fontSize: 20, opacity: 0.9 }}>Player profile — TennisMyLife</div>
            </div>

            <div style={{ width: 200, height: 200, borderRadius: 9999, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 }}>
              🎾
            </div>
          </div>

          <div style={{ position: 'absolute', right: 36, bottom: 20, fontSize: 14, opacity: 0.95, color: 'rgba(255,255,255,0.85)' }}>TennisMyLife</div>
        </div>
      ),
      { width: 1200, height: 630 }
    );

    const buf = await img.arrayBuffer();
    const buffer = Buffer.from(buf);

    // try to persist the generated image to public/og
    try {
      if (filePath) {
        await fs.promises.mkdir(publicDir, { recursive: true });
        const tmpPath = filePath + '.tmp';
        await fs.promises.writeFile(tmpPath, buffer);
        await fs.promises.rename(tmpPath, filePath);
      }
    } catch (e) {
      // ignore write errors
    }

    return new Response(buffer, { headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE_FOREVER } });
  } catch (err) {
    // Fallback: try serving static site-preview
    try {
      const site = process.env.SITE_URL || 'https://stats.tennismylife.org';
      const gres = await fetch(`${site}/og/site-preview.png`);
      if (gres && gres.ok) {
        const buf2 = await gres.arrayBuffer();
        return new Response(Buffer.from(buf2), { headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE_FOREVER } });
      }
    } catch (e) {
      // ignore
    }

    // final fallback image
    // @ts-ignore
    return new (ImageResponse as any)(
      (
        <div style={{ width: '1200px', height: '630px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontSize: 40, fontWeight: 700, padding: 40, textAlign: 'center' }}>
          TennisMyLife
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
