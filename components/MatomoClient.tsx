'use client';

import { useEffect } from 'react';

// Minimal Matomo client-side injector to preserve existing behavior from pages/_app.tsx
// It mirrors the original script injection and avoids running on the server.
declare global {
  interface Window {
    _paq?: any[];
  }
}

export default function MatomoClient() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // preserve/expose global _paq queue used by Matomo
    const _paq = (window._paq = window._paq || []);
    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);

    (function () {
      const u = '//stats.tennismylife.org/matomo-tracking/';
      _paq.push(['setTrackerUrl', u + 'matomo.php']);
      _paq.push(['setSiteId', '1']);
      const d = document;
      const g = d.createElement('script');
      const s = d.getElementsByTagName('script')[0];
      g.async = true;
      g.src = u + 'matomo.js';
      s.parentNode?.insertBefore(g, s);
    })();

    return () => {
      // no-op cleanup: Matomo script insertion is harmless if left
    };
  }, []);

  return null;
}
