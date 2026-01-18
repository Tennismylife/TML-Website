'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  href: string
  section: string
  which?: string
  title?: string
  className?: string
  children?: React.ReactNode
}

export default function ViewAllModalButton({ href, section, which, title, className, children }: Props) {
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const state = { modal: true, background: window.location.pathname, which, title, section };

    try { (window as any).__lastOpenModalPayload = state; (window as any).__modalBackgroundPath = state.background; } catch (e) {}

    try {
      const nav: any = router.push(href);
      if (nav && typeof nav.then === 'function') {
        nav.then(() => {
          try { (window as any).__modalOpenedByPush = true; } catch (e) {}
          try { window.history.replaceState(state, '', href); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {}
        }).catch(() => {
          setTimeout(() => { try { window.history.replaceState(state, '', href); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {} }, 300);
        });
      } else {
        setTimeout(() => { try { window.history.replaceState(state, '', href); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {} }, 300);
      }
    } catch (err) {
      try { window.history.replaceState(state, '', href); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {}
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className ?? 'mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded'}>
      {children ?? 'View All'}
    </button>
  )
}
