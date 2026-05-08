import { headers } from 'next/headers';

async function getMatches() {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${protocol}://${host}`;
  const response = await fetch(`${baseUrl}/schedule/matches.json`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load schedule matches data');
  }
  return response.json();
}

export default async function SchedulePage() {
  const matchesData = await getMatches();
  const r64Matches = matchesData.r64 ?? [];
  const r32Matches = matchesData.r32 ?? [];
  const totalMatches = r64Matches.length + r32Matches.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 space-y-10">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-xl shadow-black/20">
        <h1 className="text-4xl font-extrabold text-white mb-4">Schedule</h1>
        <p className="max-w-3xl text-lg text-gray-300 mb-8">
          Explore upcoming tennis action and match schedules across the ATP tour.
          This page is the new home for match schedules, upcoming tournaments, and related event information.
        </p>

      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">H2H Challenge Links</h2>
            <p className="text-gray-400 mt-1">Today’s head-to-head schedule grouped by round.</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">{totalMatches} links</span>
        </div>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold text-white">R64</h3>
            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-sm font-medium text-slate-300">{r64Matches.length} links</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {r64Matches.map((match) => (
              <article key={match.players} className="group rounded-3xl border border-white/10 bg-gray-900/80 p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">
                <a href={match.href} className="text-xl font-semibold text-yellow-300 hover:text-yellow-200 transition-colors" target="_blank" rel="noreferrer noopener">
                  {match.players.replace(/-/g, ' ').replace(/ vs /i, ' vs ')}
                </a>
                <p className="mt-3 text-sm text-gray-400 break-words">{match.href}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold text-white">R32</h3>
            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-sm font-medium text-slate-300">{r32Matches.length} link</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {r32Matches.map((match) => (
              <article key={match.players} className="group rounded-3xl border border-white/10 bg-gray-900/80 p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">
                <a href={match.href} className="text-xl font-semibold text-yellow-300 hover:text-yellow-200 transition-colors" target="_blank" rel="noreferrer noopener">
                  {match.players.replace(/-/g, ' ').replace(/ vs /i, ' vs ')}
                </a>
                <p className="mt-3 text-sm text-gray-400 break-words">{match.href}</p>
              </article>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
