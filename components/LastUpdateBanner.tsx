export default function LastUpdateBanner() {
  const latestUpdate = {
    date: "May 3, 2026",
    iso: "2026-05-03",
    flag: "🇮🇹",
    player: "Jannik Sinner",
    highlight: "reaches a historic",
    points: "14,350",
    event: "after winning Madrid 2026",
    result: "He has now won 5 ATP Masters 1000 titles in a row and remains No. 3 in the standings",
    note: "The standings will be updated tomorrow with official ATP Ranking",
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-700/60 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4 shadow-md md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: main content */}
        <div className="flex-1 text-left text-base md:text-lg sm:px-4">
          <span className="font-bold text-white">{latestUpdate.flag} {latestUpdate.player}</span>
          {' '}<span className="text-gray-300">{latestUpdate.highlight}</span>
          {' '}<span className="gold-number">{latestUpdate.points}</span>
          {' '}<span className="text-gray-300">points {latestUpdate.event}</span>

          <div className="mt-1.5 text-sm text-gray-400">
            {latestUpdate.result}
          </div>
          <div className="mt-1 text-xs text-gray-500 italic">
            {latestUpdate.note}
          </div>
        </div>

        {/* Right: badge + date */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="inline-flex items-center rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
            Last update
          </span>
          <time className="text-sm font-medium text-gray-300" dateTime={latestUpdate.iso}>
            {latestUpdate.date}
          </time>
        </div>
      </div>
    </div>
  );
}
