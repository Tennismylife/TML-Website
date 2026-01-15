"use client";

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function RouteModal({ children, onClose }: { children: React.ReactNode; onClose?: (e?: React.MouseEvent) => void }): React.ReactElement | null {
  const router = useRouter();
  const internalClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onClose) return onClose(e);
    try {
      if (typeof window !== 'undefined') {
        const st = (window as any).history?.state;
        try { console.debug('[RouteModal] internalClose, history state:', st); } catch (e) {}
        if (st && st.modal && st.background) {
          // prefer explicit stored background (global) if present
          const storedBg = (window as any).__modalBackgroundPath || st.background;
          try { console.debug('[RouteModal] closing modal, computed background:', { fromState: st.background, storedBg }); } catch (e) {}

          // First ensure modal is hidden immediately by clearing state and dispatching close-modal
          try {
            try { window.history.replaceState(null, '', storedBg); } catch (e) { console.debug('[RouteModal] replaceState failed', e); }
            try { console.debug('[RouteModal] dispatching close-modal'); } catch (e) {}
            window.dispatchEvent(new CustomEvent('close-modal'));
            try { delete (window as any).__modalBackgroundPath; } catch (e) {}
          } catch (e) { try { console.debug('[RouteModal] close dispatch failed', e); } catch (ex) {} }

          // NOTE: avoid calling router.replace() or history.back() here to prevent triggering
          // a navigation that would re-render server components and cause refetches on the
          // underlying page. The history was already restored via replaceState above, and
          // outlets listen for the 'close-modal' event and will hide without causing page reloads.
          try { delete (window as any).__modalOpenedByPush; } catch (e) {}
          return;

          return;
        }
      }
    } catch (e) { /* ignore */ }
    // fallback to router.back() which may still work in apps without history state
    router.back();
  };

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    console.debug('[RouteModal] mounted');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') internalClose();
    };
    document.addEventListener('keydown', onKey);

    const OFFSET = 80; // reduced so heading/table appears closer to the top

    const adjustInitialScroll = () => {
      if (!contentRef.current) return;
      const parent = contentRef.current;
      const firstHeading = parent.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
      const firstTable = parent.querySelector('table') as HTMLElement | null;
      const anchor = firstHeading ?? firstTable ?? parent.firstElementChild as HTMLElement | null;
      if (anchor) {
        const targetTop = Math.max(0, (anchor.offsetTop || 0) - OFFSET);
        parent.scrollTop = targetTop;
      } else {
        parent.scrollTop = 0;
      }

      if (closeButtonRef.current) {
        try { closeButtonRef.current.focus(); } catch (e) { /* ignore */ }
      }
    }; 

    // MutationObserver to detect when dynamic content (table) is rendered
    let mo: MutationObserver | null = null;
    if (contentRef.current) {
      mo = new MutationObserver(() => {
        // slightly longer delay to allow layout/async content to settle
        setTimeout(adjustInitialScroll, 120);
      });
      mo.observe(contentRef.current, { childList: true, subtree: true });
    }

    // initial adjustment in case content already present
    setTimeout(adjustInitialScroll, 120);

    return () => {
      document.removeEventListener('keydown', onKey);
      if (mo) mo.disconnect();
      console.debug('[RouteModal] unmounted');
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-start justify-center p-4 pt-8 md:pt-20"
        style={{ zIndex: 99999 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-modal="true"
        role="dialog"
      >
        {/* backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40"
          onClick={() => internalClose()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          ref={overlayRef}
        />

        {/* content - compact and aligned to top so header is visible */}
        <motion.div
          className="relative z-10 w-full max-w-3xl"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        >
          <div
            ref={contentRef}
            className="bg-gray-900/95 rounded-2xl w-full max-h-[calc(100vh-120px)] overflow-auto p-6"
            tabIndex={-1}
          >
            <div className="flex justify-end mb-4">
              <button ref={closeButtonRef} onClick={internalClose} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white">Close</button>
            </div>
            <div>{children}</div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
