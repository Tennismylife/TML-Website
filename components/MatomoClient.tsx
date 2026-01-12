'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    _paq?: any[];
    adBlockDetected?: boolean;
  }
}

export default function MatomoClient() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const _paq = (window._paq = window._paq || []);
    const MATOMO_URL = '//stats.tennismylife.org/matomo-tracking/';
    const SITE_ID = '1';

    // Imposta tracker
    _paq.push(['setTrackerUrl', MATOMO_URL + 'mtrack.php']);
    _paq.push(['setSiteId', SITE_ID]);

    // Funzione veloce per rilevare AdBlock
    function detectAdBlock(): boolean {
      try {
        const bait = document.createElement('div');
        bait.className = 'adsbox-test';
        bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
        document.body.appendChild(bait);
        const blocked = bait.offsetParent === null || bait.offsetHeight === 0;
        document.body.removeChild(bait);
        return blocked;
      } catch {
        return false;
      }
    }

    const adBlockDetected = detectAdBlock();
    window.adBlockDetected = adBlockDetected;
    console.log('AdBlock attivo:', adBlockDetected ? 'Yes' : 'No');

    // Caricamento dello script Matomo
    const g = document.createElement('script');
    g.async = true;
    g.src = MATOMO_URL + 'mtrack.js';

    g.onload = () => {
      try {
        // Imposta Custom Dimension
        _paq.push(['setCustomDimension', 1, adBlockDetected ? 'Yes' : 'No']);

        // Abilita link tracking
        _paq.push(['enableLinkTracking']);

        // Forza sempre trackPageView
        _paq.push(['trackPageView']);
        console.log('Matomo trackPageView inviato ✅');
      } catch (err) {
        console.error('Errore invio visita Matomo:', err);
      }
    };

    const s = document.getElementsByTagName('script')[0];
    s.parentNode?.insertBefore(g, s);
  }, []);

  return null;
}
