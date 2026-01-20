"use client";
import { useEffect } from 'react';

export default function HydrationDebugClient({ tableId, expected }: { tableId: string; expected: number }) {
  useEffect(() => {
    try {
      const el = document.getElementById(tableId);
      if (!el) return;
      const ssr = el.getAttribute('data-ssr-rows');
      const clientRows = el.querySelectorAll('tbody tr').length;
      if (ssr !== String(clientRows)) {
        console.warn(`[HydrationDebug] mismatch for ${tableId}: ssr=${ssr} client=${clientRows}`);
        el.setAttribute('data-hydration-mismatch', `ssr=${ssr} client=${clientRows}`);
      } else {
        el.setAttribute('data-hydration-ok', `${clientRows}`);
      }
    } catch (e) {
      // swallow errors - this is purely diagnostic
      // eslint-disable-next-line no-console
      console.error('HydrationDebugClient error', e);
    }
  }, [tableId, expected]);

  return null;
}
