"use client";

import React from "react";

interface PlayerStats {
  winsAll: number;
  winsGrandSlam: number;
  winsMasters1000: number;
  winsHard: number;
  winsGrass: number;
  winsClay: number;
  winsCarpet: number;
  titlesAll: number;
  titlesGrandSlam: number;
  titlesMasters1000: number;
  titlesHard: number;
  titlesGrass: number;
  titlesClay: number;
  titlesCarpet: number;
}

interface BarRowProps {
  label: string;
  statKey: keyof PlayerStats;
  stats1: PlayerStats;
  stats2: PlayerStats;
  type: "wins" | "titles";
}

/**
 * Calcola il valore massimo globale per un tipo (wins o titles)
 */
const getMaxGlobal = (s1: PlayerStats, s2: PlayerStats, type: "wins" | "titles") => {
  const prefix = type === "wins" ? "wins" : "titles";
  const keys = [
    `${prefix}All`,
    `${prefix}GrandSlam`,
    `${prefix}Masters1000`,
    `${prefix}Hard`,
    `${prefix}Grass`,
    `${prefix}Clay`,
    `${prefix}Carpet`,
  ] as (keyof PlayerStats)[];
  return Math.max(...keys.map((k) => Math.max(s1[k] as number, s2[k] as number)), 1);
};

export default function BarRow({ label, statKey, stats1, stats2, type }: BarRowProps) {
  const val1 = stats1[statKey] as number;
  const val2 = stats2[statKey] as number;
  const maxGlobal = getMaxGlobal(stats1, stats2, type);

  const color1 = val1 >= val2 ? "bg-blue-600" : "bg-blue-300";
  const color2 = val2 >= val1 ? "bg-red-600" : "bg-red-300";

  return (
    <div className="flex items-center">
      {/* Player 1 */}
      <div className="flex-1 flex justify-end items-center gap-2">
        <span>{val1}</span>
        <div
          className={`${color1} h-6 rounded-r transition-all duration-300`}
          style={{ width: `${(val1 / maxGlobal) * 100}%` }}
        />
      </div>

      {/* Label */}
      <div className="px-4 font-semibold text-center w-32">{label}</div>

      {/* Player 2 */}
      <div className="flex-1 flex items-center gap-2">
        <div
          className={`${color2} h-6 rounded-l transition-all duration-300`}
          style={{ width: `${(val2 / maxGlobal) * 100}%` }}
        />
        <span>{val2}</span>
      </div>
    </div>
  );
}
