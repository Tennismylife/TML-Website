import TennisMatchDatabaseClient from '@/components/TennisMatchDatabaseClient';
import DataFileListClient from '@/components/DataFileListClient';

import fs from 'fs';
import path from 'path';

export default function Page() {
  const dataDir = path.join(process.cwd(), 'data');
  let minYear = 1968;
  let maxYear = 2026;

  try {
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => /\d{4}/.test(f));
      const years: number[] = [];
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
      <h1 className="text-4xl sm:text-5xl font-bold text-center !text-white">
        Tennis Match Database
      </h1>

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




      {/* Secondo box: AO 2026 + Montpellier – allineato e occupa lo stesso spazio */}
<section className="mb-10 w-full px-6 text-center bg-gray-800/70 py-10">
  <div className="mx-auto max-w-6xl">
    <h2 className="text-2xl sm:text-3xl font-semibold mb-4 !text-white">
      Latest Update: <span className="!text-sky-400 font-bold">Australian Open 2026</span>
    </h2>
    <p className="text-gray-300 mb-6">
      The database now includes all matches from the <span className="!text-emerald-400 font-semibold">2026 Australian Open</span>, updated shortly after the final.
    </p>

    <div className="grid sm:grid-cols-2 gap-6 text-left">
      <div className="bg-gray-700 p-6 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300">
        <p className="font-medium !text-white !text-lg mb-2">Men's Final</p>
        <p className="text-sm text-gray-300">
          <span className="!text-yellow-300 font-semibold">Carlos Alcaraz</span> def. 
          <span className="!text-pink-400 font-semibold"> Novak Djokovic</span> 
          <span className="!text-emerald-400"> 2-6 6-2 6-3 7-5 </span> 
          (<span className="!text-orange-400"> 3h 02m</span>) – Career Grand Slam completed at 
          <span className="!text-sky-400 font-semibold"> 22 years, 272 days</span>.
        </p>
      </div>

      <div className="bg-gray-700 p-6 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300">
        <p className="font-medium !text-white !text-lg mb-2"> Alcaraz Semifinal</p>
        <p className="text-sm text-gray-300">
          <span className="!text-yellow-300 font-semibold"> Carlos Alcaraz</span> vs 
          <span className="!text-pink-400 font-semibold"> Alexander Zverev</span> – epic 
          <span className="!text-emerald-400 font-semibold"> 5+ hour match</span> with severe cramps. 
          Full stats: aces, break points, duration, winners/errors included.
        </p>
      </div>
    </div>

    <p className="mt-6 text-sm text-gray-400">
      All AO 2026 matches (with ATP IDs, set-by-set scores, detailed stats) are ready in the CSV files below.
    </p>
    <p className="mt-4 text-sm !text-emerald-400 font-medium">
      Ongoing: <span className="!text-yellow-300 font-semibold"> Montpellier 2026 </span> 
      (ATP 250 indoor hard) is currently in progress — live results and stats are being added in real-time.
    </p>
  </div>
</section>


      {/* Show full file list (client, non-SSR) so it's immediately visible */}
      <div style={{ marginTop: 18 }}>
        <DataFileListClient full={true} />
      </div>

      {/* Documentation section (full-width background, content centered) */}
      <section className="mt-12 w-full bg-gray-800/40 py-10">
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
