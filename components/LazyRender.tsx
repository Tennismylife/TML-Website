"use client";

import React, { useEffect, useRef, useState, startTransition } from "react";

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
            // Use startTransition so this render is non-urgent and won't block scroll events
            timerRef.current = setTimeout(() => {
              startTransition(() => setVisible(true));
            }, 80);
          }
        });
      },
      { rootMargin, threshold: 0.01 }
    );
    obs.observe(ref.current);
    return () => {
      obs.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, rootMargin]);

  if (visible) {
    return <div>{children}</div>;
  }

  return (
    <div
      ref={ref}
      style={{
        minHeight: `${placeholderHeight}px`,
        // Tells the browser it can skip paint/layout for offscreen subtrees
        contentVisibility: "auto" as any,
        containIntrinsicSize: `0 ${placeholderHeight}px`,
      }}
    />
  );
}
