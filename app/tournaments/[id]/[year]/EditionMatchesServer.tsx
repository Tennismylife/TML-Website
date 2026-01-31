import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';

export default function EditionMatchesServer({ matches }: { matches: any[] }) {
  if (!matches || matches.length === 0) return null;

  return (
    <div id="server-matches" className="overflow-x-auto md:overflow-x-visible rounded bg-gray-900 shadow mt-4">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="px-4 py-2 text-center text-gray-200">Round</th>
            <th className="px-4 py-2 text-center text-gray-200">Wrk</th>
            <th className="px-4 py-2 text-center text-gray-200">Winner</th>
            <th className="px-4 py-2 text-center text-gray-200">Lrk</th>
            <th className="px-4 py-2 text-center text-gray-200">Loser</th>
            <th className="px-4 py-2 text-center text-gray-200">Score</th>
            <th className="px-4 py-2 text-center text-gray-200">BoF</th>
            <th className="px-4 py-2 text-center text-gray-200">Min</th>
            <th className="px-4 py-2 text-center text-gray-200">WA</th>
            <th className="px-4 py-2 text-center text-gray-200">WDF</th>
            <th className="px-4 py-2 text-center text-gray-200">W1stIn%</th>
            <th className="px-4 py-2 text-center text-gray-200">W1st%</th>
            <th className="px-4 py-2 text-center text-gray-200">W2nd%</th>
            <th className="px-4 py-2 text-center text-gray-200">BPSvd</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, idx) => (
            <tr key={idx} className="hover:bg-white/5 transition">
              <td className="px-4 py-2 text-center text-sm">{m.round}</td>
              <td className="px-4 py-2 text-center text-sm">{m.winner_rank ?? '-'}</td>
              <td className="px-4 py-2 flex items-center justify-center gap-2 text-sm">
                {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-6 h-4" />}
                <Link href={getPlayerHref(m.winner_slug ?? String(m.winner_id))} className="text-gray-200 hover:text-yellow-400">
                  {m.winner_name ?? ''}
                </Link>
              </td>
              <td className="px-4 py-2 text-center text-sm">{m.loser_rank ?? '-'}</td>
              <td className="px-4 py-2 flex items-center justify-center gap-2 text-sm">
                {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-6 h-4" />}
                <Link href={getPlayerHref(m.loser_slug ?? String(m.loser_id))} className="text-gray-400 hover:text-gray-200">
                  {m.loser_name ?? ''}
                </Link>
              </td>
              <td className="px-4 py-2 text-center font-mono text-sm">{m.score}</td>
              <td className="px-4 py-2 text-center text-sm">{m.best_of ?? '-'}</td>
              <td className="px-4 py-2 text-center text-sm">{m.minutes ?? '-'}</td>
              <td className="px-4 py-2 text-center text-sm">{m.w_ace ?? '-'}</td>
              <td className="px-4 py-2 text-center text-sm">{m.w_df ?? '-'}</td>
              <td className="px-4 py-2 text-center text-sm">{m.w_1stIn != null && m.w_svpt ? `${((m.w_1stIn / m.w_svpt) * 100).toFixed(1)}%` : '-'}</td>
              <td className="px-4 py-2 text-center text-sm">{m.w_1stWon != null && m.w_1stIn ? `${((m.w_1stWon / m.w_1stIn) * 100).toFixed(1)}%` : '-'}</td>
              <td className="px-4 py-2 text-center text-sm">{m.w_2ndWon != null && m.w_svpt != null && m.w_1stIn != null ? `${((m.w_2ndWon / (m.w_svpt - m.w_1stIn)) * 100).toFixed(1)}%` : '-'}</td>
              <td className="px-4 py-2 text-center text-sm">{(m.w_bpSaved != null || m.w_bpFaced != null) ? `${m.w_bpSaved ?? 0}/${m.w_bpFaced ?? 0}` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
