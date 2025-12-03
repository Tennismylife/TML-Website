"use client";

import { Dispatch, SetStateAction } from "react";

interface FiltersComponentProps {
  selectedSurfaces: Set<string>;
  setSelectedSurfaces: Dispatch<SetStateAction<Set<string>>>;
  selectedLevels: string;
  setSelectedLevels: Dispatch<SetStateAction<string>>;
  surfaceList: string[];
}

// 🔹 Pulsante filtro riutilizzabile
function FilterButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`px-5 py-2 rounded-full font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2
        ${
          isActive
            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
    >
      {children}
    </button>
  );
}

export default function FiltersComponent({
  selectedSurfaces,
  setSelectedSurfaces,
  selectedLevels,
  setSelectedLevels,
  surfaceList,
}: FiltersComponentProps) {
  const toggleItem = <T,>(
    set: Dispatch<SetStateAction<Set<T>>>,
    selected: Set<T>,
    value: T
  ) => {
    const newSelected = new Set(selected);
    newSelected.has(value) ? newSelected.delete(value) : newSelected.add(value);
    set(newSelected);
  };

  const levelList = ["G", "M", "F", "A", "D"];
  const levelNames: Record<string, string> = {
    G: "Grand Slam",
    M: "Masters 1000",
    F: "ATP Finals",
    A: "Others",
    D: "Davis Cup",
  };

  return (
    <div className="mb-4 text-gray-100">
      {/* Surfaces */}
      <fieldset className="mb-4 p-4 rounded-xl border border-gray-700 bg-gray-900/80 shadow-md">
        <legend className="text-lg font-semibold mb-3 text-white px-2">
            Surfaces
        </legend>
        <div className="flex flex-wrap gap-3">
          {/* 🔹 All button */}
          <FilterButton
            isActive={selectedSurfaces.size === 0}
            onClick={() => setSelectedSurfaces(new Set())}
          >
            🌍 All
          </FilterButton>

          {surfaceList.map((surface) => (
            <FilterButton
              key={surface}
              isActive={selectedSurfaces.has(surface)}
              onClick={() =>
                toggleItem(setSelectedSurfaces, selectedSurfaces, surface)
              }
            >
              {surface === "Hard" && "🟦"}
              {surface === "Clay" && "🟧"}
              {surface === "Grass" && "🟩"}
              {surface === "Carpet" && "🟪"}
              {surface}
            </FilterButton>
          ))}
        </div>
      </fieldset>

      {/* Levels */}
      <fieldset className="p-4 rounded-xl border border-gray-700 bg-gray-900/80 shadow-md">
        <legend className="text-lg font-semibold mb-3 text-white px-2">
            Levels
        </legend>
        <div className="flex flex-wrap gap-3">
          <FilterButton
            isActive={selectedLevels === ""}
            onClick={() => setSelectedLevels("")}
          >
            🌍 All
          </FilterButton>
          {levelList.map((level) => (
            <FilterButton
              key={level}
              isActive={selectedLevels === level}
              onClick={() => setSelectedLevels(level)}
            >
              {levelNames[level] || level}
            </FilterButton>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
