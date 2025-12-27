import { useEffect, useRef, useState } from 'react';

export default function useIncrementalCards(totalCount: number, options?: { initialVisible?: number; debounceMs?: number }) {
  const { initialVisible = 1, debounceMs = 1000 } = options ?? {};
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(initialVisible);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // detect mobile
  useEffect(() => {
    const m = window.matchMedia('(max-width: 767.98px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile((e as MediaQueryListEvent).matches ?? (e as MediaQueryList).matches);
    setIsMobile(m.matches);
    m.addEventListener('change', handler as any);
    return () => m.removeEventListener('change', handler as any);
  }, []);

  // keep visibleCount in sane bounds when totalCount or device changes
  useEffect(() => {
    if (!isMobile) {
      setVisibleCount(totalCount);
    } else {
      setVisibleCount(prev => Math.max(1, Math.min(prev, totalCount)));
    }
  }, [isMobile, totalCount]);

  useEffect(() => {
    if (!isMobile) return;
    if (visibleCount >= totalCount) return;

    const schedule = (cb: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(cb, { timeout: debounceMs });
      } else {
        const t = (window as any).setTimeout(cb, debounceMs);
        timerRef.current = t as unknown as number;
      }
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;

        schedule(() => {
          setVisibleCount(prev => Math.min(prev + 1, totalCount));
          isLoadingRef.current = false;
        });
      });
    }, { rootMargin: '200px', threshold: 0.6 });

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        isLoadingRef.current = false;
      }
    };
  }, [isMobile, totalCount, visibleCount, debounceMs]);

  const reset = (count = initialVisible) => setVisibleCount(count);
  const showAll = () => setVisibleCount(totalCount);

  return { isMobile, visibleCount, sentinelRef, reset, showAll };
}
