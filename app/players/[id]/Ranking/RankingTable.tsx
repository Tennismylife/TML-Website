import React from 'react';

interface RankingTableProps {
  className?: string;
  children: React.ReactNode;
}

// Shared style constants for ranking tables. We keep the same Tailwind classes
// that were previously duplicated across multiple files so that all tables in
// the `players/[id]/Ranking` subdirectory look identical. If the look needs
// to change in the future you can update it in one place.
export const WRAPPER_CLASS =
  "overflow-x-auto rounded border border-white/30 bg-gray-900 shadow";
export const TABLE_CLASS = "min-w-full border-collapse";
export const TH_BASE =
  "border border-white/30 px-4 py-2 text-center text-base text-gray-200 font-semibold";
export const TD_BASE = "border border-white/10 px-4 py-2 text-base";
export const TD_LABEL = "text-gray-300 whitespace-nowrap";

export default function RankingTable({ className, children }: RankingTableProps) {
  return (
    <div className={`${className ?? ''} ${WRAPPER_CLASS}`.trim()}>
      <table className={TABLE_CLASS}>{children}</table>
    </div>
  );
}
