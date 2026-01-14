"use client";

import { useEffect } from 'react';

export default function ServerModalAdjust() {
  useEffect(() => {
    const OFFSET = 80;
    const el = document.getElementById('server-modal');
    if (!el) return;

    const adjust = () => {
      try {
        const parent = el;
        const firstHeading = parent.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
        const firstTable = parent.querySelector('table') as HTMLElement | null;
        const anchor = firstHeading ?? firstTable ?? (parent.firstElementChild as HTMLElement | null);
        if (anchor) {
          const targetTop = Math.max(0, (anchor.offsetTop || 0) - OFFSET);
          parent.scrollTop = targetTop;
        } else {
          parent.scrollTop = 0;
        }

        // focus close button if present
        const close = document.getElementById('server-modal-close') as HTMLButtonElement | null;
        if (close) close.focus();
      } catch (e) {
        // ignore
      }
    };

    // run on mount and after a small delay
    setTimeout(adjust, 60);

    const mo = new MutationObserver(() => setTimeout(adjust, 80));
    mo.observe(el, { childList: true, subtree: true });

    return () => mo.disconnect();
  }, []);

  return null;
}
