'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  showCloseButton?: boolean;
}

export default function ModalClient({ title, children, onClose, showCloseButton = true }: ModalProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow || ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // focus management: focus the modal container when mounted
  useEffect(() => {
    nodeRef.current?.focus();
  }, []);

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        ref={nodeRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-card border border-white/10 rounded-xl shadow-2xl max-h-full w-full max-w-4xl overflow-y-auto"
          onClick={e => e.stopPropagation()}
          initial={{ scale: 0.92, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 330, damping: 30 }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
              {showCloseButton && (
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition" aria-label="Chiudi">
                  <X className="w-7 h-7" />
                </button>
              )}
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-6 pt-4">
            <div className="
              text-base md:text-lg leading-snug
              [&_*]:!text-base [&_*]:md:!text-lg
              [&_table]:w-full [&_table]:max-w-2xl [&_table]:mx-auto
              [&_th]:py-3 [&_th]:px-4 [&_th]:font-semibold [&_th]:text-left [&_th]:bg-white/5
              [&_td]:py-3 [&_td]:px-4 [&_td]:border-t [&_td]:border-white/10
              [&_tbody_tr:nth-child(even)]:bg-white/3
              [&_table]:rounded-lg [&_table]:overflow-hidden
            ">
              {children}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
