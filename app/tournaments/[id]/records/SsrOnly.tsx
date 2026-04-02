'use client';
import { useEffect, useRef } from 'react';

/**
 * Renders children in the SSR HTML (visible to Googlebot) but hides them
 * immediately once JavaScript executes on the client. This prevents duplicate
 * content when a client component renders the same data interactively.
 */
export default function SsrOnly({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.display = 'none';
  }, []);
  return <div ref={ref}>{children}</div>;
}
