'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const BOT_RE = /(bot|crawl|spider|slurp|curl|wget)/i;

function derivePageTitle(pathname: string | null | undefined): string {
  if (!pathname || pathname === '/') return 'Home';
  try {
    const parts = pathname.split('/').filter(Boolean).map(p => decodeURIComponent(p).replace(/-/g, ' ').trim());
    return parts.join(' ').toLowerCase();
  } catch (e) {
    return 'Unknown';
  }
}

export default function useTrackPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    try {
      const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
      if (BOT_RE.test(String(ua))) return; // do not fire for bots (client-side safeguard)

      // Skip client-side tracking in local/dev environments to avoid Matomo noise
      const isLocal = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && String(window.location.hostname || '').includes('localhost')) || process.env.NEXT_PUBLIC_DISABLE_TRACKING === '1';
      if (isLocal) return;

      const pageTitle = derivePageTitle(pathname);
      const pageUrl = typeof window !== 'undefined' ? window.location.href : pathname;

      // Fire-and-forget POST to server route. Keep request minimal and non-blocking.
      fetch('/api/track-visit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pageTitle, pageUrl }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) {
      // swallow any errors
    }
  }, [pathname]);
}
