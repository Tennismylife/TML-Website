import React from 'react';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Small helper to humanize the name (kept consistent with page.tsx)
function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(request: Request, context: any) {
  try {
    const params = await context?.params;
    const id = params?.id ? String(params.id) : null;
    const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

    if (!id) {
      // @ts-ignore ImageResponse constructor available at runtime in Next edge
      return new (ImageResponse as any)(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0f172a',
              color: 'white',
              fontSize: 48,
              fontWeight: 700,
              padding: 40,
              textAlign: 'center',
            }}
          >
            Invalid tournament
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    // Fetch tournament header (internal API)
    const res = await fetch(`${site}/api/tournaments/${encodeURIComponent(id)}/header`, { next: { revalidate: 60 } });
    let body: any = null;
    if (res.ok) body = await res.json();

    const displayName = body?.name ? (Array.isArray(body.name) ? (body.name as any[]).slice(-1)[0] : body.name) : id;
    const human = humanizeName(String(displayName || id));

    const surfacesArr: string[] = Array.isArray(body?.surfaces) ? body.surfaces : [];
    const surfaces = surfacesArr && surfacesArr.length ? surfacesArr.join(', ') : 'Unknown Surface';

    const year = (Array.isArray(body?.editions) && body.editions[0]) ? String(body.editions[0]) : new Date().getFullYear().toString();

    const bg = `${site}/header-480.avif`;

    // @ts-ignore ImageResponse constructor available at runtime
    return new (ImageResponse as any)(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundImage: `linear-gradient(rgba(5,8,15,0.6), rgba(5,8,15,0.6)), url(${bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white',
            padding: '60px',
            boxSizing: 'border-box',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 96, height: 96, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }}>
                🎾
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, textShadow: '0 6px 20px rgba(0,0,0,0.6)' }}>{human}</div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', textShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>{surfaces} • {year}</div>
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, textShadow: '0 10px 30px rgba(0,0,0,0.7)' }}>Results, history & champions</div>
              <div style={{ fontSize: 18, opacity: 0.95, color: 'rgba(255,255,255,0.85)' }}>TennisMyLife</div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (err) {
    // On error, return a simple fallback image
    // @ts-ignore ImageResponse constructor available at runtime
    return new (ImageResponse as any)(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            color: 'white',
            fontSize: 40,
            fontWeight: 700,
            padding: 40,
            textAlign: 'center',
          }}
        >
          TennisMyLife
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
