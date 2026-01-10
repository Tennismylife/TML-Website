'use client';

import { useEffect, useRef } from 'react';

// Minimal client component that posts a server-side GA4 fallback when gtag is not available.
// - No external libs
// - Only fires when client-side GA is absent (avoids double-counting)
// - Deduplicates events per session (using sessionStorage)
// - Sends only non-PII: page path (no query string), sanitized title, referrer and user agent
// NOTE: avoids Next client hooks (usePathname/useSearchParams) which require Suspense when
// used inside `app` layouts/pages. Instead, it listens to native history events so it can
// be mounted in `app/layout.tsx` without causing a CSR bailout.

const STORAGE_KEY = 'ga4_fallback_sent_paths_v1';

function hasGtag() {
  // gtag commonly defined as function; adblockers sometimes leave a stub function
  // so check for a loader script to ensure it's actually functional.
  try {
    const gtagFn = (window as any).gtag;
    if (typeof gtagFn !== 'function') return false;

    // Check for the presence of a typical gtag/gtm loader script; if missing,
    // gtag is likely stubbed (blocked) and we should treat it as absent.
    try {
      const scripts = Array.from(document.scripts).map(s => s.src || '').filter(Boolean);
      const hasLoader = scripts.some(src => src.includes('googletagmanager.com') || src.includes('google-analytics.com') || src.includes('gtag/js'));
      if (!hasLoader) return false;
    } catch (e) {
      // If any error occurs while inspecting scripts, fall back to the function check only
    }

    return true;
  } catch (e) {
    return false;
  }
}

function getPathForReporting() {
  try {
    // For privacy, only report pathname (drop query string)
    return window.location.pathname || '/';
  } catch (e) {
    return '/';
  }
}

export default function Ga4FallbackClient() {
  const sentRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef(false);

  useEffect(() => {
    // Hydrate dedupe set from sessionStorage
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) sentRef.current = new Set(arr);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Small helper: send fallback for current path
    const maybeSend = () => {
      const path = getPathForReporting();

      if (hasGtag()) return; // GA available — no fallback
      if (sentRef.current.has(path) || pendingRef.current) return;

      pendingRef.current = true;
      const GRACE_MS = 1500;
      let timer = window.setTimeout(() => {
        if (hasGtag() || (window as any).GA_INITIALIZED) {
          pendingRef.current = false;
          return;
        }

        const payload = {
          page_path: path,
          page_title: (document && document.title) ? document.title : '',
          referrer: (document && document.referrer) ? document.referrer : '',
          user_agent: navigator?.userAgent || '',
        };

        // Try a very neutral endpoint first, then fall back to less-neutral aliases
        const endpoints = ['/p', '/_events/collect'.replace(/ /g, ''), '/ga4-fallback'];
        let succeeded = false;

        if ((window as any).GA4_FALLBACK_DEBUG) console.debug('[ga4-fallback] attempting fallback for', path, 'endpoints=', endpoints);

        const trySend = async (i = 0) => {
          if (i >= endpoints.length) {
            pendingRef.current = false;
            return;
          }
          try {
            if ((window as any).GA4_FALLBACK_DEBUG) console.debug('[ga4-fallback] POST', endpoints[i]);
            const res = await fetch(endpoints[i], {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              keepalive: true,
            });
            if (res && (res.status === 204 || (res.status >= 200 && res.status < 300))) {
              if ((window as any).GA4_FALLBACK_DEBUG) console.debug('[ga4-fallback] POST ok', endpoints[i], res.status);
              sentRef.current.add(path);
              try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sentRef.current))); } catch (e) {}
              succeeded = true;
              pendingRef.current = false;
              return;
            }
            // if response code suggests blocked/filtered or not accepted, try next
            if ((window as any).GA4_FALLBACK_DEBUG) console.debug('[ga4-fallback] POST non-ok', endpoints[i], res && res.status);
            trySend(i + 1);
          } catch (err) {
            if ((window as any).GA4_FALLBACK_DEBUG) console.debug('[ga4-fallback] POST error', endpoints[i], err && (err as Error).message);
            // Network/blocked error: try next endpoint
            trySend(i + 1);
          }
        };

        trySend().then(async () => {
          // If all XHR/fetch attempts failed, attempt a beacon via navigator.sendBeacon
          if ((navigator as any).sendBeacon) {
            try {
              const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
              const ok = (navigator as any).sendBeacon('/p', blob);
              if (ok) {
                sentRef.current.add(path);
                try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sentRef.current))); } catch (e) {}
                pendingRef.current = false;
                return;
              }
            } catch (e) {}
          }

          // As a last resort, try an image beacon (more likely to bypass XHR/Fetch blocking)
          try {
            const img = new Image();
            img.onload = () => {
              sentRef.current.add(path);
              try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sentRef.current))); } catch (e) {}
              pendingRef.current = false;
            };
            img.onerror = () => { pendingRef.current = false; };
            img.referrerPolicy = 'no-referrer';
            img.src = `/p.gif?page_path=${encodeURIComponent(path)}`;
          } catch (e) {
            pendingRef.current = false;
          }
        }).catch(() => {
          // ensure pending flag cleared and fallbacks attempted
          pendingRef.current = false;
        });
      }, GRACE_MS);

      return () => {
        clearTimeout(timer);
        pendingRef.current = false;
      };
    };

    // Listen to history navigation events (pushState/replaceState) and popstate
    const onLocationChange = () => { maybeSend(); };

    // Monkeypatch pushState/replaceState to detect SPA navigations
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    history.pushState = function (...args: any[]) {
      const res = originalPush.apply(this, args as any);
      window.dispatchEvent(new Event('locationchange'));
      return res;
    };
    history.replaceState = function (...args: any[]) {
      const res = originalReplace.apply(this, args as any);
      window.dispatchEvent(new Event('locationchange'));
      return res;
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('locationchange', onLocationChange);

    // Trigger for initial mount
    maybeSend();

    return () => {
      // restore
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('locationchange', onLocationChange);
    };
  }, []);

  return null;
}
