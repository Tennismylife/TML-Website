"use client";

import React, { useEffect, useRef, useState } from "react";

interface LazyRenderProps {
  children: React.ReactNode;
  /** How close to the viewport edge before rendering. Keep at 0 to load only when actually in view. */
  rootMargin?: string;
  /** Placeholder height while the section hasn't loaded yet. Large enough to space sections apart. */
  placeholderHeight?: number;
}

export default function LazyRender({
  children,
  rootMargin = "0px",
  placeholderHeight = 320,
}: LazyRenderProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible || !ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            obs.disconnect();
            // Defer render by one frame so the browser can finish painting the scroll
            timerRef.current = setTimeout(() => setVisible(true), 50);
          }
        });
      },
      { rootMargin }
    );
    obs.observe(ref.current);
    return () => {
      obs.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, rootMargin]);

  return (
    <div ref={ref} style={!visible ? { minHeight: `${placeholderHeight}px` } : undefined}>
      {visible ? children : null}
    </div>
  );
}
