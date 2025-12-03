"use client";

import React from "react";

interface PercentageRowProps {
  label: string;
  perc1: number;
  perc2: number;
}

/**
 * Mostra una riga con due barre percentuali a confronto (scala 0–100%)
 */
export default function PercentageRow({ label, perc1, perc2 }: PercentageRowProps) {
  const color1 = perc1 >= perc2 ? "bg-blue-600" : "bg-blue-300";
  const color2 = perc2 >= perc1 ? "bg-red-600" : "bg-red-300";

  return (
    <div className="flex items-center">
      {/* Player 1 */}
      <div className="flex-1 flex justify-end items-center gap-2">
        <span>{perc1.toFixed(1)}%</span>
        <div
          className={`${color1} h-6 rounded-r transition-all duration-300`}
          style={{ width: `${perc1}%` }}
        />
      </div>

      {/* Label */}
      <div className="px-4 font-semibold text-center w-32">{label}</div>

      {/* Player 2 */}
      <div className="flex-1 flex items-center gap-2">
        <div
          className={`${color2} h-6 rounded-l transition-all duration-300`}
          style={{ width: `${perc2}%` }}
        />
        <span>{perc2.toFixed(1)}%</span>
      </div>
    </div>
  );
}
