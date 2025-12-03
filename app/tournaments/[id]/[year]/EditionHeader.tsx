"use client";

import React from "react";
import { getSurfaceColor, getLevelColor, getTextColorForRound } from "@/lib/colors";
import {getLevelFullName} from "@/lib/utils";

type EditionHeaderProps = {
  tourney_name: string;
  year: string;
  tourney_level: string | string[];
  surface: string | string[];
  tourney_date: string;
  draw_size: number;
};

export default function EditionHeader({
  tourney_name,
  year,
  tourney_level,
  surface,
  tourney_date,
  draw_size,
}: EditionHeaderProps) {
  // Normalizziamo tourney_level e surface come array
  const levels = Array.isArray(tourney_level) ? tourney_level : [tourney_level];
  const surfaces = Array.isArray(surface) ? surface : [surface];

  // Normalizziamo la data in formato YYYY-MM-DD
  const formattedDate = (() => {
    const date = new Date(tourney_date);
    if (isNaN(date.getTime())) return tourney_date; // fallback se data non valida
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();

  return (
    <header className="relative bg-gradient-to-r from-green-700 via-green-500 to-yellow-400 text-white p-8 rounded-2xl mb-6 w-full shadow-xl overflow-hidden">
      {/* Livelli (badge) */}
      <div className="absolute top-4 right-6 flex flex-wrap gap-2">
        {levels.map((level, i) => {
          const color = getLevelColor(level) ?? "#555";
          const textColor = getTextColorForRound(color);
          return (
            <span
              key={i}
              aria-label={`Tournament level: ${level}`}
              className="px-4 py-1 rounded-full text-sm font-semibold shadow-md flex-shrink-0"
              style={{ backgroundColor: color, color: textColor }}
            >
             {getLevelFullName(level)}
            </span>
          );
        })}
      </div>

      {/* Nome torneo */}
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold drop-shadow-lg break-words whitespace-normal">
          {tourney_name || "Unknown Tournament"} {year || ""}
        </h1>
        <p className="mt-3 text-lg md:text-xl font-medium text-white/90">
          Date: {formattedDate} | Draw: {draw_size}
        </p>
      </div>

      {/* Superfici */}
      <div className="absolute bottom-4 left-6 flex flex-wrap gap-2">
        {surfaces.map((s, i) => {
          const color = getSurfaceColor(s) ?? "#888";
          const textColor = getTextColorForRound(color);
          return (
            <span
              key={i}
              aria-label={`Surface: ${s}`}
              className="text-base md:text-lg font-medium px-3 py-1 rounded-full shadow-md flex-shrink-0"
              style={{ backgroundColor: color, color: textColor }}
            >
              {s}
            </span>
          );
        })}
      </div>
    </header>
  );
}
