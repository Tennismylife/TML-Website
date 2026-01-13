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

    // Prefer the header image if available (lighter green tone), otherwise fall back to header-480.avif, then a solid light tennis green
    const headerImg = `${site}/header.jpg`;
    let bgStyle = 'linear-gradient(#2ecc71,#2ecc71)'; // light tennis green fallback
    try {
      // try header.jpg first
      const headerResp = await fetch(headerImg, { next: { revalidate: 60 } });
      const headerCt = headerResp?.headers?.get ? headerResp.headers.get('content-type') : null;
      if (headerResp && headerResp.ok && headerCt && headerCt.startsWith('image/')) {
        bgStyle = `linear-gradient(135deg, rgba(46,204,113,0.45), rgba(46,204,113,0.12)), url(${headerImg})`;
      } else {
        // fall back to the smaller avif header
        const bgResp = await fetch(bg, { next: { revalidate: 60 } });
        const ct = bgResp?.headers?.get ? bgResp.headers.get('content-type') : null;
        if (bgResp && bgResp.ok && ct && ct.startsWith('image/')) {
          bgStyle = `linear-gradient(135deg, rgba(46,204,113,0.45), rgba(46,204,113,0.12)), url(${bg})`;
        }
      }
    } catch (err) {
      // on error keep solid light green fallback
    }

    // Read optional page/tab/sub params to customize the image title
    const urlObj = new URL(request.url);
    const pageParam = urlObj.searchParams.get('page');
    const tabParam = urlObj.searchParams.get('tab');
    const subParam = urlObj.searchParams.get('sub');

    const tabLabels: Record<string, string> = {
      count: 'Counts',
      rounds: 'Rounds',
      ages: 'Ages',
      percentage: 'Percentages',
      timespan: 'Timespans',
      'rounds-on-entries': 'Rounds on Entries',
      least: 'Least',
      'average-age': 'Average Age',
    };

    const agesSub: Record<string, string> = {
      main: 'Main',
      winners: 'Winners',
      titles: 'Titles',
      youngestrounds: 'Youngest Rounds',
      oldestrounds: 'Oldest Rounds',
    };

    const percSub: Record<string, string> = {
      overall: 'Overall',
      'per-round': 'Per Round',
      rounds: 'Per Round',
    };

    let typeLabel = 'Records';
    if (pageParam === 'records') {
      if (tabParam) {
        const base = tabLabels[tabParam] ?? humanizeName(tabParam || '');
        if (tabParam === 'ages' && subParam) typeLabel = `${base} — ${(agesSub[subParam] ?? humanizeName(subParam || ''))}`;
        else if (tabParam === 'percentage' && subParam) typeLabel = `${base} — ${(percSub[subParam] ?? humanizeName(subParam || ''))}`;
        else typeLabel = base;
      } else {
        typeLabel = 'Records';
      }
    } else if (pageParam) {
      typeLabel = humanizeName(pageParam);
    }

    // Tab-specific styles (icon and palette)
    const tabStyles: Record<string, { icon: string; from: string; to: string; stripeOpacity: number }> = {
      default: { icon: '🏆', from: '#C6FF00', to: '#FFEB3B', stripeOpacity: 0.10 },
      ages: { icon: '🎂', from: '#4FC3F7', to: '#0288D1', stripeOpacity: 0.12 },
      percentage: { icon: '📊', from: '#4DD0E1', to: '#00838F', stripeOpacity: 0.12 },
      rounds: { icon: '🔁', from: '#B39DDB', to: '#7E57C2', stripeOpacity: 0.12 },
    };

    const styleForTab = tabParam && tabStyles[tabParam] ? tabStyles[tabParam] : tabStyles.default;
    const iconEmoji = styleForTab.icon;
    const typeGradientCss = `linear-gradient(90deg, ${styleForTab.from}, ${styleForTab.to})`;
    const stripeBgCss = `linear-gradient(90deg, ${styleForTab.from}, ${styleForTab.to})`;

    // If bgStyle does not reference an external image (no url(...)), return a PNG response immediately with caching headers.
    if (!/url\(/.test(bgStyle)) {
      // Build an ImageResponse using the solid bgStyle (no external assets) and return a Response with cache headers
      // @ts-ignore
      const fallbackImg = new (ImageResponse as any)(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              backgroundImage: bgStyle,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'white',
              padding: '60px',
              boxSizing: 'border-box',
              fontFamily: 'Arial, Helvetica, sans-serif',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', left: -120, top: 40, transform: 'rotate(-22deg)', width: 600, height: 260, background: stripeBgCss, borderRadius: 8, filter: 'blur(20px)', opacity: styleForTab.stripeOpacity }} />

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1, textShadow: '0 8px 28px rgba(0,0,0,0.6)' }}>{human}</div>
              </div>

              <div style={{ width: 160, height: 160, borderRadius: 9999, background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>{iconEmoji}</div>
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 36 }}>
              <div style={{ fontSize: 48, fontWeight: 900, background: typeGradientCss, WebkitBackgroundClip: 'text', color: 'transparent', textShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>{typeLabel}</div>
            </div>

            <div style={{ position: 'absolute', right: 36, bottom: 20, fontSize: 14, opacity: 0.95, color: 'rgba(255,255,255,0.85)' }}>TennisMyLife</div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
      const buf = await fallbackImg.arrayBuffer();
      return new Response(Buffer.from(buf), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600' } });
    }

    // @ts-ignore ImageResponse constructor available at runtime
    return new (ImageResponse as any)(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundImage: bgStyle,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white',
            padding: '60px',
            boxSizing: 'border-box',
            fontFamily: 'Arial, Helvetica, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* decorative soft stripe */}
          <div style={{ position: 'absolute', left: -120, top: 40, transform: 'rotate(-22deg)', width: 600, height: 260, background: stripeBgCss, borderRadius: 8, filter: 'blur(20px)', opacity: styleForTab.stripeOpacity }} />

          {/* Header: tournament name + small meta + trophy */}
          

          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1, textShadow: '0 8px 28px rgba(0,0,0,0.6)' }}>{human}</div>
            </div>

            <div style={{ width: 160, height: 160, borderRadius: 9999, background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>{iconEmoji}</div>
          </div>

          {/* Main label: record type */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 36 }}>
            <div style={{ fontSize: 48, fontWeight: 900, background: typeGradientCss, WebkitBackgroundClip: 'text', color: 'transparent', textShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>{typeLabel}</div>
          </div>

          {/* footer label */}
          <div style={{ position: 'absolute', right: 36, bottom: 20, fontSize: 14, opacity: 0.95, color: 'rgba(255,255,255,0.85)' }}>TennisMyLife</div>
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
