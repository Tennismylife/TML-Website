'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    adBlockDetected?: boolean;
  }
}

export default function MatomoClient() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // --- Rilevazione AdBlock (come prima) ---
    if (window.adBlockDetected === undefined) {
      const bait = document.createElement('div');
      bait.className = 'adsbox-test';
      bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
      document.body.appendChild(bait);

      const adBlocked =
        bait.offsetParent === null || bait.offsetHeight === 0;

      try {
        if (typeof (bait as any).remove === 'function') {
          (bait as any).remove();
        } else if (bait.parentNode) {
          bait.parentNode.removeChild(bait);
        }
      } catch (e) {
        // ignore removal errors
      }

      window.adBlockDetected = adBlocked;

      console.log('AdBlock attivo:', adBlocked ? 'Yes' : 'No');
    }

    // --- Matomo client tracking corretto ---
    const MATOMO_URL =
      'https://stats.tennismylife.org/matomo-tracking/mtrack.php';
    const SITE_ID = '1';

    const pixelUrl =
      MATOMO_URL +
      '?idsite=' + SITE_ID +
      '&rec=1' +
      '&url=' + encodeURIComponent(window.location.href) +
      '&dimension1=' + (window.adBlockDetected ? 'Yes' : 'No') +
      '&r=' + Math.random();

    // Invia l’hit
    const img = new Image();
    img.src = pixelUrl;

    console.log('SPA Track Matomo inviato per', pathname, '✓');

  }, [pathname]);

  return null;
}