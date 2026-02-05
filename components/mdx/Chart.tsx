'use client';
import { useEffect, useRef } from 'react';

export default function Chart({ data = [] }: { data?: number[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    // Placeholder: simple sparkline using inline SVG
    const max = Math.max(...data, 1);
    const points = data.map((v, i) => `${(i/(data.length-1))*100},${100 - (v/max*100)}`).join(' ');
    ref.current.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-20"><polyline fill="none" stroke="#60a5fa" stroke-width="2" points="${points}" /></svg>`;
  }, [data]);
  return <div ref={ref} />;
}
