'use client';

import { useEffect } from 'react';

// Minimal Matomo client-side injector to preserve existing behavior from pages/_app.tsx
// It mirrors the original script injection and avoids running on the server.
declare global {
  interface Window {
    _paq?: any[];
    __matomoPageTracked?: boolean;
  }
}

export default function MatomoClient() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // preserve/expose global _paq queue used by Matomo
    const _paq = (window._paq = window._paq || []);

    (function () {
      const u = '//stats.tennismylife.org/matomo-tracking/';
      _paq.push(['setTrackerUrl', u + 'matomo.php']);
      _paq.push(['setSiteId', '1']);

      // Detect AdBlock and track page view once with a custom dimension
      function detectAdBlockAndTrack() {
        let adTest: HTMLElement | null = null;
        try {
          adTest = document.createElement('div');
          adTest.className = 'ad-banner-test';
          adTest.style.cssText = 'height:1px;width:1px;position:absolute;left:-9999px;';
          adTest.setAttribute('data-ad-test', '1');
          document.body.appendChild(adTest);

          const computed = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(adTest) : ({} as CSSStyleDeclaration);
          const hidden = (adTest.offsetParent === null || adTest.offsetHeight === 0 || (computed && computed.display === 'none'));
          _paq.push(['setCustomDimension', 1, hidden ? 'Yes' : 'No']);
        } catch (e) {
          // safe fallback
          _paq.push(['setCustomDimension', 1, 'No']);
        } finally {
          if (!(window as any).__matomoPageTracked) {
            _paq.push(['trackPageView']);
            _paq.push(['enableLinkTracking']);
            (window as any).__matomoPageTracked = true;
          } else {
            _paq.push(['enableLinkTracking']);
          }
          try { if (adTest && adTest.parentNode) adTest.parentNode.removeChild(adTest); } catch (e) {}
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(detectAdBlockAndTrack, 100); });
      } else {
        setTimeout(detectAdBlockAndTrack, 100);
      }

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
