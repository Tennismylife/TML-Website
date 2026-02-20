"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Match } from "@/types";

interface RowData {
  year: number;
  M: number;
  W: number;
  L: number;
  winPct: number;
  setW: number;
  setL: number;
  setPct: number;
  gameW: number;
  gameL: number;
  gamePct: number;
  tbW: number;
  tbL: number;
  tbPct: number;
  ms: number;
  hldPct: number;
  brkPct: number;
  aPct: number;
  dfPct: number;
  firstInPct: number;
  firstWonPct: number;
  secondWonPct: number;
  spwPct: number;
  rpwPct: number;
  tpwPct: number;
  dr: number;
  bestLabel: string;
}

interface SummarySeasonsClientProps {
  rows: RowData[];
}

export default function SummarySeasonsClient({ rows }: SummarySeasonsClientProps) {
  const [visibleCount, setVisibleCount] = useState(3);
  const containerRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((v) => Math.min(rows.length, v + 3));
        }
      });
    }, { root: null, rootMargin: '200px' });

    const sentinel = document.createElement('tr');
    sentinel.setAttribute('data-sentinel', '');
    if (containerRef.current) containerRef.current.appendChild(sentinel);
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      if (containerRef.current && sentinel.parentNode) {
        containerRef.current.removeChild(sentinel);
      }
    };
  }, [rows.length]);

  const renderTd = (val: string | number, align: "left" | "center" = "center") => (
    <td className={`px-2 py-1 text-sm text-${align}`}>{val}</td>
  );

  return (
    <tbody ref={containerRef}>
      {rows.slice(0, visibleCount).map((r) => (
        <tr key={r.year} className="hover:bg-gray-800/50">
          {renderTd(r.year, 'left')}
          {renderTd(r.M)}
          {renderTd(r.W)}
          {renderTd(r.L)}
          {renderTd(r.winPct.toFixed(2) + '%')}
          {renderTd(r.setW)}
          {renderTd(r.setL)}
          {renderTd(r.setPct.toFixed(2) + '%')}
          {renderTd(r.gameW)}
          {renderTd(r.gameL)}
          {renderTd(r.gamePct.toFixed(2) + '%')}
          {renderTd(r.tbW)}
          {renderTd(r.tbL)}
          {renderTd(r.tbPct.toFixed(2) + '%')}
          {renderTd(r.bestLabel)}
        </tr>
      ))}
    </tbody>
  );
}
