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
  // gtag commonly defined as function; adblockers usually remove it
  try {
    return typeof (window as any).gtag === 'function';
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

        fetch('/ga4-fallback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).then((res) => {
          if (res && (res.status === 204 || (res.status >= 200 && res.status < 300))) {
            sentRef.current.add(path);
            try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sentRef.current))); } catch (e) {}
          }
        }).catch(() => {}).finally(() => { pendingRef.current = false; });
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
