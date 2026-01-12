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

      // Detect AdBlock robustly (multiple test elements) and track page view once with a custom dimension
      function detectAdBlockAndTrack() {
        const adNames = ['ad-banner-test', 'adsbox', 'doubleclick-test', 'adsense-test', 'banner-ad-test'];
        const els: HTMLElement[] = [];
        try {
          for (const name of adNames) {
            const el = document.createElement('div');
            el.className = name;
            el.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;top:0;';
            el.setAttribute('data-ad-test', name);
            document.body.appendChild(el);
            els.push(el);
          }

          setTimeout(() => {
            let blocked = false;
            for (const e of els) {
              if (!document.body.contains(e) || e.offsetParent === null || e.offsetHeight === 0) {
                blocked = true;
                break;
              }
              const cs = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(e) : null;
              if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')) {
                blocked = true;
                break;
              }
            }

            try { _paq.push(['setCustomDimension', 1, blocked ? 'Yes' : 'No']); } catch (err) {}
            if (!(window as any).__matomoPageTracked) {
              _paq.push(['trackPageView']);
              (window as any).__matomoPageTracked = true;
            }
            _paq.push(['enableLinkTracking']);
            console.log('AdBlock attivo: ' + (blocked ? 'Yes' : 'No'));

            // cleanup
            for (const e of els) {
              try { if (e && e.parentNode) e.parentNode.removeChild(e); } catch (err) {}
            }
          }, 100);
        } catch (err) {
          try { _paq.push(['setCustomDimension', 1, 'No']); _paq.push(['enableLinkTracking']); } catch (e) {}
          console.log('AdBlock detection failed', err);
        }
      }

      // run when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', detectAdBlockAndTrack);
      } else {
        detectAdBlockAndTrack();
      }

      const d = document;
      const g = d.createElement('script');
      const s = d.getElementsByTagName('script')[0];
      g.async = true;
      // prefer a neutral filename, but fall back to Matomo's default if not available
      g.src = u + 'mtrack.js';
      g.onerror = function () {
        try {
          if (g.src && typeof (g.src as string).endsWith === 'function' && (g.src as string).endsWith('mtrack.js')) {
            g.src = u + 'matomo.js';
          }
        } catch (e) { /* ignore */ }
      };
      s.parentNode?.insertBefore(g, s);
    })();

    return () => {
      // no-op cleanup: Matomo script insertion is harmless if left
    };
  }, []);

  return null;
}
