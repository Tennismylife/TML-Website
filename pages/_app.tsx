// pages/_app.tsx
import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import '../styles/globals.css'; // se hai CSS globali

declare global {
  interface Window {
    _paq?: any[];
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Inserisce lo script Matomo solo lato client
    if (typeof window !== 'undefined') {
      var _paq = (window._paq = window._paq || []);
      _paq.push(['trackPageView']);
      _paq.push(['enableLinkTracking']);

      (function() {
        var u = '//stats.tennismylife.org/matomo-tracking/';
        _paq.push(['setTrackerUrl', u + 'matomo.php']);
        _paq.push(['setSiteId', '1']);
        var d = document,
          g = d.createElement('script'),
          s = d.getElementsByTagName('script')[0];
        g.async = true;
        g.src = u + 'matomo.js';
        s.parentNode?.insertBefore(g, s);
      })();
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
