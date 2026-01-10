'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Minimal client component that posts a server-side GA4 fallback when gtag is not available.
// - No external libs
// - Only fires when client-side GA is absent (avoids double-counting)
// - Deduplicates events per session (using sessionStorage)
// - Sends only non-PII: page path (no query string), sanitized title, referrer and user agent

const STORAGE_KEY = 'ga4_fallback_sent_paths_v1';

function hasGtag() {
  // gtag commonly defined as function; adblockers usually remove it
  try {
    return typeof (window as any).gtag === 'function';
  } catch (e) {
    return false;
  }
}

function getPathForReporting(pathname: string, search: string | null) {
  // For privacy, drop querystring (search) — we only report pathname
  return pathname || '/';
}

export default function Ga4FallbackClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

    // Run on route change only
    const path = getPathForReporting(pathname || '/', searchParams?.toString() || '');

    if (hasGtag()) {
      // If gtag is available, do nothing — avoid duplication
      return;
    }

    // Deduplicate per session
    if (sentRef.current.has(path) || pendingRef.current) return;

    pendingRef.current = true;

    // Small grace period to allow GA to initialize on slow networks/idle callbacks.
    // If GA initializes within this window (via GAListener setting `window.GA_INITIALIZED` or
    // `window.gtag` becoming available), we abort sending the fallback to avoid double-counting.
    const GRACE_MS = 1500;
    let timer = setTimeout(() => {
      // Re-check presence of GA before sending
      if (hasGtag() || (window as any).GA_INITIALIZED) {
        pendingRef.current = false;
        return;
      }

      const payload = {
        page_path: path,
        page_title: (document && document.title) ? document.title : '',
        referrer: (document && document.referrer) ? document.referrer : '',
        // user_agent is optional; server will fall back to request header if omitted
        user_agent: navigator?.userAgent || '',
      };

      // Use keepalive so event can be sent during navigations/unload if supported
      fetch('/ga4-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).then((res) => {
        // 2xx or 204 indicates accepted
        if (res && (res.status === 204 || (res.status >= 200 && res.status < 300))) {
          sentRef.current.add(path);
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sentRef.current))); } catch (e) {}
        }
      }).catch(() => {
        // Best-effort only; swallow to avoid affecting user flow
      }).finally(() => {
        pendingRef.current = false;
      });
    }, GRACE_MS);

    // Cleanup if pathname/searchParams change quickly
    return () => {
      clearTimeout(timer);
      pendingRef.current = false;
    };

  }, [pathname, searchParams]);

  return null;
}
