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
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div>
        <label className="mr-2 font-medium text-white">Surface:</label>
        <select
          value={surface}
          onChange={(e) => onSurfaceChange(e.target.value)}
          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="Hard">Hard</option>
          <option value="Clay">Clay</option>
          <option value="Grass">Grass</option>
          <option value="Carpet">Carpet</option>
        </select>
      </div>
      <div>
        <label className="mr-2 font-medium text-white">Season:</label>
        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          {Array.from({ length: 2025 - 1968 + 1 }, (_, i) => {
            const y = 2025 - i;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label className="mr-2 font-medium text-white">Category:</label>
        <select
          value={tourneyLevel}
          onChange={(e) => onTourneyLevelChange(e.target.value)}
          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  );
}
