"use client";

interface StatsSelectorProps {
  stat: string;
  setStat: (newStat: string) => void;
  statLabels: Record<string, string>;
  minMatches: number;
  setMinMatches: (value: number) => void;
}

export default function StatsSelector({
  stat,
  setStat,
  statLabels,
  minMatches,
  setMinMatches,
}: StatsSelectorProps) {
  return (
    <div className="mb-4 flex flex-col gap-4">
      {/* Stat Dropdown */}
      <div>
        <label className="mr-2 font-medium text-white">Stat:</label>
        <select
          value={stat}
          onChange={(e) => setStat(e.target.value)}
          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(statLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Minimum Matches Slider */}
      <div>
        <label className="block text-sm font-medium mb-1 text-white">
          Minimum Matches: {minMatches}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={minMatches}
          onChange={(e) => setMinMatches(Number(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
}
