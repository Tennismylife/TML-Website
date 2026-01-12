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

    // Rileva AdBlock solo la prima volta
    if (window.adBlockDetected === undefined) {
      const bait = document.createElement('div');
      bait.className = 'adsbox-test';
      bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
      document.body.appendChild(bait);
      const adBlocked = bait.offsetParent === null || bait.offsetHeight === 0;
      document.body.removeChild(bait);
      window.adBlockDetected = adBlocked;
      console.log('AdBlock attivo:', adBlocked ? 'Yes' : 'No');
    }

    // Costruisci URL pixel invisibile
    const MATOMO_URL = 'https://stats.tennismylife.org/matomo-tracking/mtrack.php';
    const SITE_ID = '1';
    const pixelUrl =
      MATOMO_URL +
      '?idsite=' + SITE_ID +
      '&rec=1' +
      '&url=' + encodeURIComponent(location.href) +
      '&dimension1=' + (window.adBlockDetected ? 'Yes' : 'No') +
      '&r=' + Math.random();

    // Invia visita
    new Image().src = pixelUrl;
    console.log('SPA Track Matomo inviato per', pathname, '✅');

  }, [pathname]); // 🔑 trigger su cambio di route

  return null;
}
