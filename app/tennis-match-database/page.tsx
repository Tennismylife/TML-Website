import TennisMatchDatabaseClient from '@/components/TennisMatchDatabaseClient';
import DataFileListClient from '@/components/DataFileListClient';

export default function Page() {
  return (
    <main>
      <h1 className="text-4xl sm:text-5xl font-bold text-center">Tennis Match Database</h1>

      <section className="mb-6 text-center">
        <p className="text-lg sm:text-xl font-medium">
          TennisMyLife hosts a highly reliable Tennis Match Database. All historical match data, ATP stats, and ongoing tournaments are available as CSV downloads. Built and tested over years using purpose-built software, this database is a truly dependable resource.
        </p>
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
            <li><strong>tourney_id:</strong> Tournament ID based on ATP database</li>
            <li><strong>tourney_name:</strong> City where the tournament was played</li>
            <li><strong>surface:</strong> Hard, clay, grass, carpet</li>
            <li><strong>draw_size:</strong> Tournament draw (128, 64, 32, 16, 8, 4)</li>
            <li><strong>tourney_level:</strong> G (Grand Slam), A (ATP Tour), D (Davis Cup), F (Masters/ATP Finals)</li>
            <li><strong>tourney_date:</strong> Week of the tournament</li>
            <li><strong>match_num:</strong> Match number</li>
            <li><strong>winner_id, loser_id:</strong> Player IDs from ATP database</li>
            <li><strong>winner_name, loser_name:</strong> Full names of the players</li>
            <li><strong>winner_rank, loser_rank:</strong> ATP ranking points at match time</li>
            <li><strong>score:</strong> Final match score</li>
            <li><strong>round:</strong> R128, R64, R32, R16, QF, SF, F</li>
            <li><strong>best_of:</strong> Number of sets (3 or 5)</li>
            <li><strong>minutes:</strong> Match duration</li>
            <li>Service stats, aces, double faults, break points, and other detailed statistics</li>
          </ul>

          <p className="mt-4">
            We continuously monitor ATP updates, including additions, corrections, and removals from historical records. Our database is also enriched with verified data from newspapers, tennis blogs, and other statistics websites.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-2">Frequent Updates &amp; Live Results</h3>
          <p>
            TennisMyLife is updated daily, and ideally in real-time, following live ATP match results. We aim to provide fresh tennis statistics without waiting for weekly summaries.
          </p>

          <p className="mt-4">
            We welcome collaborations and bug reports. Help us improve the quality of this tennis database and make it the most reliable source for ATP stats, match history, and player analytics.
          </p>
        </div>
      </section>

      {/* Keep sidebar component for compatibility (hidden on small screens if desired) */}
      <div style={{ display: 'none' }}>
        <TennisMatchDatabaseClient />
      </div>
    </main>
  );
}