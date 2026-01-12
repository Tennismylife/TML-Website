'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    _paq?: any[];
    __matomoPageTracked?: boolean;
    adBlockDetected?: boolean;
  }
}

export default function MatomoClient() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const _paq = (window._paq = window._paq || []);

    const MATOMO_URL = '//stats.tennismylife.org/matomo-tracking/';
    const SITE_ID = '1';

    // Tracker URL punta a mtrack.php (rinominato per evitare blocchi)
    _paq.push(['setTrackerUrl', MATOMO_URL + 'mtrack.php']);
    _paq.push(['setSiteId', SITE_ID]);

    // Funzione di rilevamento AdBlock
    function detectAdBlock(): boolean {
      const baitNames = ['ad-banner-test', 'adsbox', 'doubleclick-test', 'adsense-test', 'banner-ad-test'];
      const els: HTMLElement[] = [];

      try {
        for (const name of baitNames) {
          const el = document.createElement('div');
          el.className = name;
          el.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;top:0;';
          el.setAttribute('data-ad-test', name);
          document.body.appendChild(el);
          els.push(el);
        }

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

        // cleanup
        for (const e of els) {
          try { e.parentNode?.removeChild(e); } catch {}
        }

        return blocked;
      } catch {
        return false;
      }
    }

    const adBlockDetected = detectAdBlock();
    window.adBlockDetected = adBlockDetected; // debug globale
    console.log('AdBlock attivo:', adBlockDetected ? 'Yes' : 'No');

    // Caricamento dinamico dello script rinominato
    const g = document.createElement('script');
    g.async = true;
    g.src = MATOMO_URL + 'mtrack.js';
    g.onload = () => {
      try {
        _paq.push(['setCustomDimension', 1, adBlockDetected ? 'Yes' : 'No']);
        _paq.push(['enableLinkTracking']);
        if (!window.__matomoPageTracked) {
          _paq.push(['trackPageView']);
          window.__matomoPageTracked = true;
        }
      } catch (err) {
        console.error('Errore Matomo tracking:', err);
      }
    };

    const s = document.getElementsByTagName('script')[0];
    s.parentNode?.insertBefore(g, s);

    return () => {};
  }, []);

  return null;
}
