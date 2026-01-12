'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adBlockDetected?: boolean;
  }
}

export default function MatomoClient() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ------------------------
    // 1️⃣ Rilevamento AdBlock
    // ------------------------
    const bait = document.createElement('div');
    bait.className = 'adsbox-test';
    bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
    document.body.appendChild(bait);

    const adBlocked = bait.offsetParent === null || bait.offsetHeight === 0;
    document.body.removeChild(bait);

    window.adBlockDetected = adBlocked;
    console.log('AdBlock attivo:', adBlocked ? 'Yes' : 'No');

    // ------------------------
    // 2️⃣ Costruzione URL Matomo (pixel invisibile)
    // ------------------------
    const MATOMO_URL = 'https://stats.tennismylife.org/matomo-tracking/mtrack.php';
    const SITE_ID = '1';

    const pixelUrl =
      MATOMO_URL +
      '?idsite=' + SITE_ID +
      '&rec=1' +
      '&url=' + encodeURIComponent(location.href) +
      '&dimension1=' + (adBlocked ? 'Yes' : 'No') +
      '&r=' + Math.random(); // evita caching

    // ------------------------
    // 3️⃣ Invio visita tramite pixel invisibile
    // ------------------------
    new Image().src = pixelUrl;
    console.log('Visita Matomo inviata tramite pixel ✅');

  }, []);

  return null;
}
