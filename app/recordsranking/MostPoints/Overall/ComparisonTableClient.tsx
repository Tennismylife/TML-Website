'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Flag from '@/components/Flag';

type Player = 'djokovic' | 'nadal' | 'sinner' | 'federer';

interface TooltipPos { x: number; y: number; side: 'right' | 'left'; }

/* ── Tooltip content per player ── */
const TOOLTIPS: Record<Player, { title: string; cols: string[]; rows: (string | number)[][]; totals: (string | number)[]; wide?: boolean }> = {
  djokovic: {
    title: 'Ranking at 06/06/2016',
    cols: ['Tournament', 'Season', 'Result', '2009 system', '2024 system'],
    rows: [
      ['Roland Garros', 2016, 'W', 2000, 2000],
      ['Australian Open', 2016, 'W', 2000, 2000],
      ['US Open', 2015, 'W', 2000, 2000],
      ['Wimbledon', 2015, 'W', 2000, 2000],
      ['Indian Wells Masters', 2016, 'W', 1000, 1000],
      ['Miami Masters', 2016, 'W', 1000, 1000],
      ['Madrid Masters', 2016, 'W', 1000, 1000],
      ['Paris Masters', 2015, 'W', 1000, 1000],
      ['Shanghai Masters', 2015, 'W', 1000, 1000],
      ['ATP Finals', 2015, 'W', 1300, 1300],
      ['Canada Masters', 2015, 'F', 600, 650],
      ['Cincinnati Masters', 2015, 'F', 600, 650],
      ['Rome Masters', 2016, 'F', 600, 650],
      ['Beijing', 2015, 'W', 500, 500],
      ['Doha', 2016, 'W', 250, 250],
      ['Dubai', 2016, 'QF', 90, 100],
      ['Monte Carlo Masters', 2016, 'R32', 10, 50],
    ],
    totals: ['Total', '', '', '16,950', '17,150'],
  },
  nadal: {
    title: 'Ranking at 20/04/2009',
    cols: ['Tournament', 'Season', 'Result', '2009 system', '2024 system'],
    rows: [
      ['Roland Garros', 2008, 'W', 2000, 2000],
      ['Wimbledon', 2008, 'W', 2000, 2000],
      ['Australian Open', 2009, 'W', 2000, 2000],
      ['Monte Carlo Masters', 2008, 'W', 1000, 1000],
      ['Hamburg Masters', 2008, 'W', 1000, 1000],
      ['Canada Masters', 2008, 'W', 1000, 1000],
      ['Monte Carlo Masters', 2009, 'W', 1000, 1000],
      ['Indian Wells Masters', 2009, 'W', 1000, 1000],
      ['US Open', 2008, 'SF', 900, 800],
      ['Olympic Games', 2008, 'W', 800, 0],
      ['Barcelona', 2008, 'W', 600, 500],
      ['Cincinnati Masters', 2008, 'SF', 450, 400],
      ['Madrid Masters', 2008, 'SF', 450, 400],
      ['Queens', 2008, 'W', 350, 250],
      ['Rotterdam', 2009, 'F', 300, 330],
      ['Paris Masters', 2008, 'QF', 250, 200],
      ['Miami Masters', 2009, 'QF', 180, 200],
      ['Rome Masters', 2009, 'R32', 70, 50],
      ['Davis Cup', 2009, 'WG R1', 40, 0],
    ],
    totals: ['Total', '', '', '15,390', '14,130'],
  },
  sinner: {
    title: 'Ranking at 25/05/2026',
    cols: ['Tournament', 'Season', 'Result', '2009 system', '2024 system'],
    rows: [
      ['Wimbledon', 2025, 'W', 2000, 2000],
      ['US Open', 2025, 'F', 1200, 1300],
      ['Roland Garros', 2025, 'F', 1200, 1300],
      ['Australian Open', 2026, 'SF', 720, 800],
      ['Nitto ATP Finals', 2025, 'W', 1500, 1500],
      ['Rome', 2026, 'W', 1000, 1000],
      ['Madrid', 2026, 'W', 1000, 1000],
      ['Monte Carlo Masters', 2026, 'W', 1000, 1000],
      ['Miami Masters', 2026, 'W', 1000, 1000],
      ['Indian Wells Masters', 2026, 'W', 1000, 1000],
      ['Paris Masters', 2025, 'W', 1000, 1000],
      ['Cincinnati Masters', 2025, 'F', 600, 650],
      ['Shanghai Masters', 2025, 'R32', 45, 50],
      ['Vienna', 2025, 'W', 500, 500],
      ['Beijing', 2025, 'W', 500, 500],
      ['Doha', 2026, 'QF', 90, 100],
      ['Halle', 2025, 'R16', 45, 50],
    ],
    totals: ['Total', '', '', '14,400', '14,750'],
  },
  federer: {
    title: 'Ranking at 20/11/2006',
    cols: ['Tournament', 'Season', 'Result', '2006', '2009 system', '2024 system'],
    wide: true,
    rows: [
      ['Tennis Masters Cup', 2006, 'W', 750, 1500, 1500],
      ['Basel', 2006, 'W', 250, 250, 250],
      ['Madrid Masters', 2006, 'W', 500, 1000, 1000],
      ['Tokyo', 2006, 'W', 250, 500, 500],
      ['US Open', 2006, 'W', 1000, 2000, 2000],
      ['Cincinnati Masters', 2006, 'R32', 35, 45, 50],
      ['Canada Masters', 2006, 'W', 500, 1000, 1000],
      ['Wimbledon', 2006, 'W', 1000, 2000, 2000],
      ['Halle', 2006, 'W', 225, 250, 250],
      ['Roland Garros', 2006, 'F', 700, 1200, 1300],
      ['Rome Masters', 2006, 'F', 350, 600, 650],
      ['Monte Carlo Masters', 2006, 'F', 350, 600, 650],
      ['Miami Masters', 2006, 'W', 500, 1000, 1000],
      ['Indian Wells Masters', 2006, 'W', 500, 1000, 1000],
      ['Dubai', 2006, 'F', 210, 300, 330],
      ['Australian Open', 2006, 'W', 1000, 2000, 2000],
      ['Doha', 2006, 'W', 250, 250, 250],
    ],
    totals: ['Total', '', '', '8,370', '15,495', '15,730'],
  },
};

const GRID_NARROW = 'grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr_0.9fr]';
const GRID_WIDE   = 'grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_0.8fr_0.8fr]';

function TooltipContent({ player }: { player: Player }) {
  const t = TOOLTIPS[player];
  const grid = t.wide ? GRID_WIDE : GRID_NARROW;
  return (
    <>
      <div className="mb-3 text-base font-semibold text-white">{t.title}</div>
      <div className={`grid ${grid} gap-2 text-xs uppercase tracking-wide text-gray-400`}>
        {t.cols.map((c, i) => (
          <span key={i} className={i === 0 ? 'font-semibold text-white' : 'text-center'}>{c}</span>
        ))}
      </div>
      <div className={`mt-2 grid ${grid} gap-2 text-sm text-gray-200`}>
        {t.rows.map((row, ri) =>
          row.map((cell, ci) => (
            <span key={`${ri}-${ci}`} className={ci === 0 ? '' : 'text-center'}>{cell}</span>
          ))
        )}
      </div>
      <div className={`mt-3 grid ${grid} gap-2 border-t border-white/10 pt-2 text-sm font-semibold text-white`}>
        {t.totals.map((cell, ci) => (
          <span key={ci} className={ci === 0 ? '' : 'text-center'}>{cell}</span>
        ))}
      </div>
    </>
  );
}

export default function ComparisonTableClient() {
  const [hovered, setHovered] = useState<Player | null>(null);
  const [pos, setPos] = useState<TooltipPos>({ x: 0, y: 0, side: 'right' });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleEnter = (player: Player, e: React.MouseEvent<HTMLTableRowElement>) => {
    const tooltipW = player === 'federer' ? 544 : 448;
    const tooltipH = 420;
    const mx = e.clientX;
    const my = e.clientY;
    const side = mx + tooltipW + 20 < window.innerWidth ? 'right' : 'left';
    const clampedY = Math.min(Math.max(my, tooltipH / 2 + 8), window.innerHeight - tooltipH / 2 - 8);
    setPos({ x: side === 'right' ? mx + 20 : mx - 20, y: clampedY, side });
    setHovered(player);
  };

  const tooltip = hovered && (
    <div
      className={`fixed z-[9999] ${hovered === 'federer' ? 'w-[34rem]' : 'w-[28rem]'} rounded-2xl border border-white/20 bg-slate-950/95 p-4 text-left text-sm text-gray-200 shadow-2xl pointer-events-none`}
      style={{
        left: pos.x,
        top: pos.y,
        transform: `${pos.side === 'left' ? 'translateX(-100%) ' : ''}translateY(-50%)`,
      }}
    >
      <TooltipContent player={hovered} />
    </div>
  );

  const trClass = 'border-t border-white/10 hover:bg-gray-800 cursor-default';
  const tdBase = 'border border-white/10 px-4 py-2 text-lg';

  return (
    <>
      <table className="min-w-full border-collapse text-sm text-center overflow-visible">
        <thead>
          <tr className="bg-black">
            <th className={`${tdBase} text-center text-gray-200`}>Player</th>
            <th className={`${tdBase} text-center text-gray-200`}>Real points</th>
            <th className={`${tdBase} text-center text-gray-200`}>2009 point system</th>
            <th className={`${tdBase} text-center text-gray-200`}>2024 point system</th>
          </tr>
        </thead>
        <tbody>
          <tr className={trClass} onMouseEnter={e => handleEnter('djokovic', e)} onMouseLeave={() => setHovered(null)}>
            <td className={`${tdBase} text-gray-200`}><span className="inline-flex items-center gap-2 justify-center"><Flag ioc="SRB" className="w-4 h-3" /> Novak Djokovic</span></td>
            <td className={`${tdBase} text-indigo-300`}>16,950</td>
            <td className={`${tdBase} text-gray-200`}>16,950</td>
            <td className={`${tdBase} text-gray-200`}>17,150</td>
          </tr>
          <tr className={trClass} onMouseEnter={e => handleEnter('nadal', e)} onMouseLeave={() => setHovered(null)}>
            <td className={`${tdBase} text-gray-200`}><span className="inline-flex items-center gap-2 justify-center"><Flag ioc="ESP" className="w-4 h-3" /> Rafael Nadal</span></td>
            <td className={`${tdBase} text-indigo-300`}>15,390</td>
            <td className={`${tdBase} text-gray-200`}>15,390</td>
            <td className={`${tdBase} text-gray-200`}>14,130</td>
          </tr>
          <tr className={trClass} onMouseEnter={e => handleEnter('sinner', e)} onMouseLeave={() => setHovered(null)}>
            <td className={`${tdBase} text-gray-200`}><span className="inline-flex items-center gap-2 justify-center"><Flag ioc="ITA" className="w-4 h-3" /> Jannik Sinner</span></td>
            <td className={`${tdBase} text-indigo-300`}>14,750</td>
            <td className={`${tdBase} text-gray-200`}>14,400</td>
            <td className={`${tdBase} text-gray-200`}>14,750</td>
          </tr>
          <tr className={trClass} onMouseEnter={e => handleEnter('federer', e)} onMouseLeave={() => setHovered(null)}>
            <td className={`${tdBase} text-gray-200`}><span className="inline-flex items-center gap-2 justify-center"><Flag ioc="SUI" className="w-4 h-3" /> Roger Federer</span></td>
            <td className={`${tdBase} text-indigo-300`}>8,370</td>
            <td className={`${tdBase} text-gray-200`}>15,495</td>
            <td className={`${tdBase} text-gray-200`}>15,730</td>
          </tr>
        </tbody>
      </table>
      {mounted && hovered && createPortal(tooltip, document.body)}
    </>
  );
}
