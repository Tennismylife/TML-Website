import TennisMatchDatabaseClient from '@/components/TennisMatchDatabaseClient';
import DataFileListClient from '@/components/DataFileListClient';

import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type DataFile = { name: string; url: string; size?: number; mtime?: string };
function getCurrentAtpTourneys(limit = 2): string[] {
  const livePath = path.join(process.cwd(), 'data', 'ongoing_tourneys.csv');
  if (!fs.existsSync(livePath)) return [];

  try {
    const raw = fs.readFileSync(livePath, 'utf8');
    if (!raw.trim()) return [];

    const lines = raw.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const nameIdx = headers.indexOf('tourney_name');
    if (nameIdx < 0) return [];

    const seen = new Set<string>();
    const names: string[] = [];

    for (let i = 1; i < lines.length && names.length < limit; i += 1) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(',');
      const name = (cols[nameIdx] ?? '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }

    return names;
  } catch {
    return [];
  }
}

export default function Page() {
  const dataDir = path.join(process.cwd(), 'data');
  let minYear = 1968;
  let maxYear = 2026;
  let initialFiles: DataFile[] = [];
  const currentTourneys = getCurrentAtpTourneys();
  const liveTournamentSentence = currentTourneys.length
    ? `${currentTourneys.join(' and ')} are currently in progress — live results and stats are being updated in real-time.`
    : 'The current ATP Tour week is being updated — live results and stats are being refreshed as soon as they are available.';

  try {
    if (fs.existsSync(dataDir)) {
      const walkCsvFiles = (dir: string, rootDir: string): string[] => {
        const items: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            items.push(...walkCsvFiles(fullPath, rootDir));
          } else if (entry.isFile() && /\.csv$/i.test(entry.name)) {
            const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
            items.push(relPath);
          }
        }
        return items;
      };

      const files = walkCsvFiles(dataDir, dataDir);
      const years: number[] = [];
      initialFiles = files.map((name) => {
        const st = fs.statSync(path.join(dataDir, ...name.split('/')));
        return {
          name,
          url: `https://stats.tennismylife.org/data/${name.split('/').map(encodeURIComponent).join('/')}`,
          size: st.size,
          mtime: st.mtime.toISOString(),
        };
      });
      files.forEach(f => {
        const m = f.match(/(\d{4})/g);
        if (m) m.forEach(y => years.push(parseInt(y, 10)));
      });
      if (years.length) {
        minYear = Math.min(...years);
        maxYear = Math.max(...years);
      }
    }
  } catch (e) {
    // ignore
  }

  return (
    <main>
      <div className="flex flex-col items-center mt-6 gap-4 px-4">
        <div className="flex items-center justify-center gap-4">
          <h1 className="text-4xl sm:text-5xl font-bold !text-white text-center">
            Tennis Match Database
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white font-bold animate-pulse shadow-lg">
            <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" aria-hidden="true"></span>
            <span className="uppercase tracking-widest">LIVE</span>
          </div>
        </div>
        {/* mailbox below heading on all screens */}
        <div className="bg-blue-600 text-white rounded-lg px-6 py-3 text-base shadow-lg text-center">
          📬 <a href="mailto:infotennismylife@gmail.com" className="underline">infotennismylife@gmail.com</a><br/>
          info, reports, debugging, sponsorship
        </div>
      </div>

      {/* Primo box: intro – ora occupa tutto lo spazio */}
<section className="mb-10 w-full px-6 text-center bg-gray-900/80 py-10">
  <div className="mx-auto text-center">
    <p className="text-lg sm:text-xl font-medium !text-gray-200 leading-relaxed">
      <span className="!text-sky-400 font-semibold">TennisMyLife</span> hosts a highly reliable  
      <span className="!text-emerald-400 font-semibold"> Tennis Match Database</span>. 
      All <span className="!text-yellow-300 font-semibold"> historical match data</span>, 
      <span className="!text-pink-400 font-semibold"> ATP stats</span>, and ongoing tournaments are available as 
      <span className="!text-orange-400 font-semibold"> CSV downloads</span>. Built and tested over years using 
      purpose-built software, this database is a truly 
      <span className="!text-red-400 font-semibold"> dependable resource</span>.
    </p>
  </div>
</section>

<section className="mb-8 w-full px-6 text-center bg-gray-800/70 py-6">
  <style>{`.live-tourney-names{color:#4ade80 !important;}`}</style>
  <div className="mx-auto max-w-3xl">
    <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-slate-100">Live Tournaments</h2>
    <p className="text-base sm:text-lg text-gray-300">
      {currentTourneys.length > 0 ? (
        <>
          {currentTourneys.map((name, idx) => (
            <span key={name}>
              <span className="live-tourney-names">{name}</span>
              {idx < currentTourneys.length - 1 ? <span className="text-white"> and </span> : null}
            </span>
          ))}
          {' are currently in progress — live results and stats are being updated in real-time.'}
        </>
      ) : (
        liveTournamentSentence
      )}
    </p>
  </div>
</section>


      {/* Show full file list — pre-populated from server-side filesystem read (no client fetch = no CLS) */}
      <div style={{ marginTop: 18 }}>
        <DataFileListClient full={true} initialFiles={initialFiles} />
      </div>

      {/* Sponsored banner */}
      <div className="mt-12 mb-2 mx-6">
        <a
          href="https://app.brckt.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row items-center gap-4 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-yellow-500/40 rounded-xl px-6 py-4 shadow-lg hover:border-yellow-400 transition-colors group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Brckt.png"
            alt="Brckt – Tournament bracket software"
            className="h-14 w-auto object-contain flex-shrink-0"
          />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400 mb-0.5">Sponsored</p>
            <p className="text-base font-bold text-white group-hover:text-yellow-300 transition-colors">
              Brckt — Predict ATP & WTA tournament brackets
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              Pick your winners round by round and compete against friends. Who will lift the trophy? Make your predictions on ATP and WTA draws and find out!
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-yellow-400 group-hover:text-yellow-300 flex-shrink-0">
            Try it free →
          </span>
        </a>
      </div>

      {/* Documentation section (full-width background, content centered) */}
      <section className="mt-4 w-full bg-gray-800/40 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-3 text-center">Documentation</h2>
        </div>
        <div className="w-full px-6 text-sm text-gray-300 leading-relaxed text-left">
          <p className="mb-3">
            TennisMyLife hosts a comprehensive tennis match database, including all historical match data, ATP player stats, and ongoing tournament results. All datasets are available as CSV downloads, making it easy for analysts, fans, and developers to explore tennis statistics.
          </p>
          <p>
            There are many other tennis databases out there, but TennisMyLife stands out. Unlike Sackmann’s database, we use ATP player IDs, providing a more convenient way to calculate player records and cross-reference data directly on the official ATP website.
          </p>
          <h3 className="text-lg font-medium mt-4 mb-2">Database Columns Include:</h3>
<ul className="list-disc list-inside space-y-1 text-sm">
  <li><strong className="!text-sky-300">tourney_id:</strong> Tournament ID based on ATP database</li>
  <li><strong className="!text-sky-300">tourney_name:</strong> City where the tournament was played</li>
  <li><strong className="!text-sky-300">surface:</strong> Hard, clay, grass, carpet</li>
  <li><strong className="!text-sky-300">draw_size:</strong> Tournament draw (128, 64, 32, 16, 8, 4)</li>
  <li><strong className="!text-sky-300">tourney_level:</strong> G (Grand Slam), A (ATP Tour), D (Davis Cup), F (Masters/ATP Finals)</li>
  <li><strong className="!text-sky-300">indoor:</strong> Yes/No</li>
  <li><strong className="!text-sky-300">tourney_date:</strong> Week of the tournament (YYYYMMDD)</li>
  <li><strong className="!text-sky-300">match_num:</strong> Match number in the tournament</li>
  <li><strong className="!text-sky-300">winner_id:</strong> ATP player ID of the winner</li>
  <li><strong className="!text-sky-300">winner_seed:</strong> Seed of the winner</li>
  <li><strong className="!text-sky-300">winner_entry:</strong> How the winner entered the tournament (e.g., Q, WC)</li>
  <li><strong className="!text-sky-300">winner_name:</strong> Full name of the winner</li>
  <li><strong className="!text-sky-300">winner_hand:</strong> Playing hand of the winner (R/L)</li>
  <li><strong className="!text-sky-300">winner_ht:</strong> Height of the winner in cm</li>
  <li><strong className="!text-sky-300">winner_ioc:</strong> Country code of the winner</li>
  <li><strong className="!text-sky-300">winner_age:</strong> Age of the winner at match time</li>
  <li><strong className="!text-sky-300">winner_rank:</strong> ATP ranking of the winner at match time</li>
  <li><strong className="!text-sky-300">winner_rank_points:</strong> ATP ranking points of the winner at match time</li>
  <li><strong className="!text-sky-300">loser_id:</strong> ATP player ID of the loser</li>
  <li><strong className="!text-sky-300">loser_seed:</strong> Seed of the loser</li>
  <li><strong className="!text-sky-300">loser_entry:</strong> How the loser entered the tournament</li>
  <li><strong className="!text-sky-300">loser_name:</strong> Full name of the loser</li>
  <li><strong className="!text-sky-300">loser_hand:</strong> Playing hand of the loser (R/L)</li>
  <li><strong className="!text-sky-300">loser_ht:</strong> Height of the loser in cm</li>
  <li><strong className="!text-sky-300">loser_ioc:</strong> Country code of the loser</li>
  <li><strong className="!text-sky-300">loser_age:</strong> Age of the loser at match time</li>
  <li><strong className="!text-sky-300">loser_rank:</strong> ATP ranking of the loser at match time</li>
  <li><strong className="!text-sky-300">loser_rank_points:</strong> ATP ranking points of the loser at match time</li>
  <li><strong className="!text-sky-300">score:</strong> Final match score (set by set)</li>
  <li><strong className="!text-sky-300">best_of:</strong> Number of sets (3 or 5)</li>
  <li><strong className="!text-sky-300">round:</strong> R128, R64, R32, R16, QF, SF, F</li>
  <li><strong className="!text-sky-300">minutes:</strong> Match duration in minutes</li>
  <li><strong className="!text-sky-300">w_ace:</strong> Aces by winner</li>
  <li><strong className="!text-sky-300">w_df:</strong> Double faults by winner</li>
  <li><strong className="!text-sky-300">w_svpt:</strong> Total serve points by winner</li>
  <li><strong className="!text-sky-300">w_1stIn:</strong> First serves in by winner</li>
  <li><strong className="!text-sky-300">w_1stWon:</strong> First serve points won by winner</li>
  <li><strong className="!text-sky-300">w_2ndWon:</strong> Second serve points won by winner</li>
  <li><strong className="!text-sky-300">w_SvGms:</strong> Service games played by winner</li>
  <li><strong className="!text-sky-300">w_bpSaved:</strong> Break points saved by winner</li>
  <li><strong className="!text-sky-300">w_bpFaced:</strong> Break points faced by winner</li>
  <li><strong className="!text-sky-300">l_ace:</strong> Aces by loser</li>
  <li><strong className="!text-sky-300">l_df:</strong> Double faults by loser</li>
  <li><strong className="!text-sky-300">l_svpt:</strong> Total serve points by loser</li>
  <li><strong className="!text-sky-300">l_1stIn:</strong> First serves in by loser</li>
  <li><strong className="!text-sky-300">l_1stWon:</strong> First serve points won by loser</li>
  <li><strong className="!text-sky-300">l_2ndWon:</strong> Second serve points won by loser</li>
  <li><strong className="!text-sky-300">l_SvGms:</strong> Service games played by loser</li>
  <li><strong className="!text-sky-300">l_bpSaved:</strong> Break points saved by loser</li>
  <li><strong className="!text-sky-300">l_bpFaced:</strong> Break points faced by loser</li>
</ul>


          <p className="mt-4">
            We continuously monitor ATP updates, including additions, corrections, and removals from historical records. Our database is also enriched with verified data from newspapers, tennis blogs, and other statistics websites.
          </p>
          <h3 className="text-lg font-medium mt-4 mb-2">Frequent Updates & Live Results</h3>
          <p>
            TennisMyLife is updated daily, and ideally in real-time, following live ATP match results. We aim to provide fresh tennis statistics without waiting for weekly summaries.
          </p>
          <p className="mt-4">
            We welcome collaborations and bug reports. Help us improve the quality of this tennis database and make it the most reliable source for ATP stats, match history, and player analytics.
          </p>
          <div className="mt-6 text-sm text-gray-300">
            <strong className="!text-white">Creator:</strong> Tennis My Life<br/>
            <strong className="!text-white">License:</strong> <a className="underline !text-sky-400" href="https://opensource.org/licenses/MIT">MIT License</a><br/>
            <strong className="!text-white">Temporal coverage:</strong> <span className="!text-yellow-300 font-semibold">{minYear}–{maxYear}</span><br/>
            <strong className="!text-white">Access:</strong> <span className="!text-emerald-400 font-semibold">Free to use (isAccessibleForFree)</span>
          </div>
        </div>
      </section>

      {/* Keep sidebar component for compatibility (hidden on small screens if desired) */}
      <div style={{ display: 'none' }}>
        <TennisMatchDatabaseClient />
      </div>
    </main>
  );
}
