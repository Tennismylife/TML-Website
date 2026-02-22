export default function LastUpdateBanner() {
  const now = new Date();
  const latestUpdate = {
    date: now.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    iso: now.toISOString().slice(0,10),
    player: "Carlos Alcaraz",
    highlight: "reaches historic No. 3",
    points: "13,650",
    event: "after the 2026 Australian Open",
    result: "defeated Novak Djokovic 2-6 6-2 6-3 7-5 in the final — also becoming the youngest player in history to complete the Career Grand Slam",
  }; 

  return (
    <div className="mb-6 rounded-xl border border-gray-700/60 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4 shadow-md md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: badge + date */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
            Last update
          </span>
          <time className="text-sm font-medium text-gray-300" dateTime={latestUpdate.iso}>
            {latestUpdate.date}
          </time>
        </div>

        {/* Right: main content */}
        <div className="text-right text-base md:text-lg">
          <span className="font-bold text-white">{latestUpdate.player}</span>
          <span className="mx-1.5 text-gray-300">{latestUpdate.highlight}</span>
          <span className="font-medium text-emerald-400">({latestUpdate.points} points)</span>

          <div className="mt-1.5 text-sm text-gray-400">
            {latestUpdate.event} — {latestUpdate.result}
          </div>
        </div>
      </div>
    </div>
  );
}
