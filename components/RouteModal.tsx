"use client";

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function RouteModal({ children, onClose }: { children: React.ReactNode; onClose?: (e?: React.MouseEvent) => void }) {
  const router = useRouter();
  const internalClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onClose) return onClose(e);
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
        setTimeout(adjustInitialScroll, 80);
      });
      mo.observe(contentRef.current, { childList: true, subtree: true });
    }

    // initial adjustment in case content already present
    setTimeout(adjustInitialScroll, 60);

    return () => {
      document.removeEventListener('keydown', onKey);
      if (mo) mo.disconnect();
      console.debug('[RouteModal] unmounted');
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 md:pt-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-modal="true"
        role="dialog"
      >
        {/* backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
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
