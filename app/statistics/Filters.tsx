"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Filters({
  surface,
  onSurfaceChange,
  year,
  onYearChange,
  tourneyLevel,
  onTourneyLevelChange,
}: {
  surface: string;
  onSurfaceChange: (value: string) => void;
  year: string;
  onYearChange: (value: string) => void;
  tourneyLevel: string;
  onTourneyLevelChange: (value: string) => void;
}) {
  const START_YEAR = 1968;
  const CURRENT_YEAR = new Date().getFullYear();

  return (
    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label htmlFor="surfaceSelect" className="mb-2 font-medium text-white text-sm">Surface:</label>
            <select
              id="surfaceSelect"
              value={surface}
              onChange={(e) => onSurfaceChange(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="all">All</option>
              <option value="Hard">Hard</option>
              <option value="Clay">Clay</option>
              <option value="Grass">Grass</option>
              <option value="Carpet">Carpet</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="seasonSelect" className="mb-2 font-medium text-white text-sm">Season:</label>
            <select
              id="seasonSelect"
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="all">All</option>
              {Array.from({ length: CURRENT_YEAR - START_YEAR + 1 }, (_, i) => {
                const y = CURRENT_YEAR - i;
                return (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="categorySelect" className="mb-2 font-medium text-white text-sm">Category:</label>
            <select
              id="categorySelect"
              value={tourneyLevel}
              onChange={(e) => onTourneyLevelChange(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="all">All</option>
              <option value="G">Grand Slam</option>
              <option value="M">Masters 1000</option>
              <option value="A">Others</option>
              <option value="D">Davis Cup</option>
              <option value="O">Olympics</option>
            </select>
          </div>
        </div>
    </div>
  );
}
