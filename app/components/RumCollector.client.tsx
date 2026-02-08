"use client";

import { useEffect } from "react";

function getNodeDescriptor(node: any) {
  try {
    if (!node) return null;
    if (node.id) return `${node.tagName.toLowerCase()}#${node.id}`;
    const cls = node.className && typeof node.className === 'string' ? node.className.split(/\s+/)[0] : '';
    return `${node.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  } catch (e) {
    return null;
  }
}

export default function RumCollector() {
  useEffect(() => {
    let clsValue = 0;
    const entries: any[] = [];

    function sendPayload(final = false) {
      try {
        const payload = {
          url: location.pathname + location.search,
          userAgent: navigator.userAgent,
          cls: clsValue,
          entries: entries.slice(0, 20), // limit size
          final,
          ts: Date.now(),
        };
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/rum/cls', blob);
        } else {
          // best-effort fallback
          fetch('/api/rum/cls', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, keepalive: true });
        }
      } catch (e) {
        // ignore
      }
    }

    if ('PerformanceObserver' in window) {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if ((entry as any).hadRecentInput) continue;
          const value = (entry as any).value ?? 0;
          clsValue += value;

          const simpleSources = (entry as any).sources ? (entry as any).sources.map((s: any) => ({
            node: getNodeDescriptor(s.node),
            previousRect: s.previousRect,
            currentRect: s.currentRect,
          })) : [];

          entries.push({ value, sources: simpleSources, id: (entry as any).id });

          // send a sample immediately (not too frequently)
          if (clsValue >= 0.05 || entries.length >= 5) sendPayload(false);
        }
      });
      try {
        po.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // Some browsers require observe without options
        try { (po as any).observe({ entryTypes: ['layout-shift'] }); } catch (_) { }
      }

      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') sendPayload(true);
      };
      window.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('pagehide', () => sendPayload(true));

      return () => {
        try { po.disconnect(); } catch (e) { }
        window.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }

    // Fallback: measure CLS via web-vitals if available (support both getCLS and onCLS)
    let wid: any = null;
    (async () => {
      try {
        const mod: any = await import('web-vitals').catch(() => null);
        if (mod) {
          const reporter = mod.getCLS ?? mod.onCLS ?? null;
          if (reporter) {
            // reporter may return a cancel function (getCLS) or undefined (onCLS)
            const maybeCancel = reporter((metric: any) => {
              clsValue = metric.value;
              entries.push({ value: metric.value, entries: metric.entries });
              sendPayload(false);
            });

            if (typeof maybeCancel === 'function') {
              wid = { cancel: maybeCancel };
            } else {
              // normalize to an object with cancel() to simplify teardown
              wid = { cancel: () => {} };
            }
          }
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      if (wid && wid.cancel) wid.cancel();
    };
  }, []);

  return null;
}
