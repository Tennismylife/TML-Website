"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ReactGA from "react-ga4";

const GA_ID = "G-71D4H6D4VN"; // il tuo ID GA4

// Estendiamo il tipo Window per GA_INITIALIZED
declare global {
  interface Window {
    GA_INITIALIZED?: boolean;
  }
}

export default function GAListener() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Defer GA loading until idle or user interaction to avoid blocking LCP/TBT
    const injectGtag = () => {
      if (document.querySelector(`script[src*="gtag/js?id=${GA_ID}"]`)) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });
    };

    const initGA = async () => {
      try {
        await injectGtag();
        if (!window.GA_INITIALIZED) {
          ReactGA.initialize(GA_ID, { gaOptions: { cookie_domain: 'auto' } });
          window.GA_INITIALIZED = true;
        }
        ReactGA.send({ hitType: 'pageview', page: pathname });
      } catch (e) {
        // Non-fatal: GA failed to load
        console.warn('GA load failed', e);
      }
    };

    const idleCallback = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(() => initGA(), { timeout: 3000 })
      : (setTimeout(() => initGA(), 3000) as unknown as number);

    // If user interacts within the first 3s, initialize earlier
    const interactionHandler = () => {
      initGA();
      window.removeEventListener('keydown', interactionHandler);
      window.removeEventListener('pointerdown', interactionHandler);
    };

    window.addEventListener('keydown', interactionHandler, { passive: true });
    window.addEventListener('pointerdown', interactionHandler, { passive: true });

    return () => {
      if ((window as any).cancelIdleCallback && idleCallback && typeof idleCallback === 'number') {
        (window as any).cancelIdleCallback(idleCallback);
      } else if (typeof idleCallback === 'number') {
        clearTimeout(idleCallback as unknown as number);
      }
      window.removeEventListener('keydown', interactionHandler);
      window.removeEventListener('pointerdown', interactionHandler);
    };
  }, [pathname]);

  return null;
}
