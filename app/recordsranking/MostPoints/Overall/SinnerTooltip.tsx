'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Flag from '@/components/Flag';

export default function SinnerTooltip() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, side: 'right' as 'right' | 'left' });
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const tooltipWidth = 448;
      const side = rect.right + tooltipWidth + 12 < window.innerWidth ? 'right' : 'left';
      setPos({
        x: side === 'right' ? rect.right + 12 : rect.left - 12,
        y: rect.top + rect.height / 2,
        side,
      });
    }
    setVisible(true);
  };

  const tooltip = (
    <div
      className="fixed z-[9999] w-[28rem] rounded-2xl border border-white/20 bg-slate-950/95 p-4 text-left text-sm text-gray-200 shadow-2xl pointer-events-none"
      style={{ left: pos.x, top: pos.y, transform: pos.side === 'right' ? 'translateY(-50%)' : 'translateX(-100%) translateY(-50%)' }}
    >
      <div className="mb-3 text-base font-semibold text-white">Ranking at 27/04/2026</div>
      <div className="grid grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr_0.9fr] gap-2 text-xs uppercase tracking-wide text-gray-400">
        <span className="font-semibold text-white">Tournament</span>
        <span className="text-center">Season</span>
        <span className="text-center">Result</span>
        <span className="text-center">2009 system</span>
        <span className="text-center">2024 system</span>
      </div>
      <div className="mt-2 grid grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr_0.9fr] gap-2 text-sm text-gray-200">
        <span>Wimbledon</span><span className="text-center">2025</span><span className="text-center">W</span><span className="text-center">2000</span><span className="text-center">2000</span>
        <span>US Open</span><span className="text-center">2025</span><span className="text-center">F</span><span className="text-center">1300</span><span className="text-center">1200</span>
        <span>Roland Garros</span><span className="text-center">2025</span><span className="text-center">F</span><span className="text-center">1300</span><span className="text-center">1200</span>
        <span>Nitto ATP Finals</span><span className="text-center">2025</span><span className="text-center">W</span><span className="text-center">1500</span><span className="text-center">1500</span>
        <span>Paris Masters</span><span className="text-center">2025</span><span className="text-center">W</span><span className="text-center">1000</span><span className="text-center">1000</span>
        <span>Cincinnati Masters</span><span className="text-center">2025</span><span className="text-center">F</span><span className="text-center">650</span><span className="text-center">600</span>
        <span>Rome Masters</span><span className="text-center">2025</span><span className="text-center">F</span><span className="text-center">650</span><span className="text-center">600</span>
        <span>Vienna</span><span className="text-center">2025</span><span className="text-center">W</span><span className="text-center">500</span><span className="text-center">500</span>
        <span>Beijing</span><span className="text-center">2025</span><span className="text-center">W</span><span className="text-center">500</span><span className="text-center">500</span>
        <span>Shanghai Masters</span><span className="text-center">2025</span><span className="text-center">R32</span><span className="text-center">50</span><span className="text-center">45</span>
        <span>Australian Open</span><span className="text-center">2026</span><span className="text-center">SF</span><span className="text-center">800</span><span className="text-center">720</span>
        <span>Monte Carlo Masters</span><span className="text-center">2026</span><span className="text-center">W</span><span className="text-center">1000</span><span className="text-center">1000</span>
        <span>Miami Masters</span><span className="text-center">2026</span><span className="text-center">W</span><span className="text-center">1000</span><span className="text-center">1000</span>
        <span>Indian Wells Masters</span><span className="text-center">2026</span><span className="text-center">W</span><span className="text-center">1000</span><span className="text-center">1000</span>
        <span>Doha</span><span className="text-center">2026</span><span className="text-center">QF</span><span className="text-center">100</span><span className="text-center">90</span>
        <span>Madrid</span><span className="text-center">2026</span><span className="text-center">W</span><span className="text-center">1000</span><span className="text-center">1000</span>
      </div>
      <div className="mt-3 grid grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr_0.9fr] gap-2 border-t border-white/10 pt-2 text-sm font-semibold text-white">
        <span>Total</span>
        <span></span>
        <span></span>
        <span className="text-center">14,350</span>
        <span className="text-center">13,955</span>
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      className="flex w-full items-center justify-center gap-2 cursor-default py-1"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setVisible(false)}
    >
      <Flag ioc="ITA" className="w-4 h-3" /> Jannik Sinner
      {mounted && visible && createPortal(tooltip, document.body)}
    </div>
  );
}
