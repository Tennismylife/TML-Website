'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface SetsProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
}

interface SetsRecord {
  player: { id: string; name: string; ioc: string };
  wins: number;
  totalMatches: number;
  winPercentage: number;
  losses?: number;
}

export default function Sets({ selectedSurfaces, selectedLevels, selectedRounds }: SetsProps) {
  const [data, setData] = useState<SetsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // --- Valori statici Best Of ---
  const bestOfOptions = [3, 5];
  const [selectedBestOf, setSelectedBestOf] = useState<Set<number>>(new Set());

  const [activeTab, setActiveTab] = useState<'win' | 'straight' | 'decider' | 'won1st' | 'lost1st' | 'won1st2nd' | 'lost1st2nd' | 'split1st2nd' | 'up2to1' | 'down2to1'>('win');

  // --- Toggle selezione Best Of ---
  const toggleBestOf = (value: number) => {
    setSelectedBestOf(prev => {
      const newSet = new Set(prev);
      if (newSet.has(value)) newSet.delete(value);
      else newSet.add(value);
      return newSet;
    });
  };

  // --- Fetch data based on activeTab ---
  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    selectedBestOf.forEach(b => query.append('best_of', String(b)));
    if (selectedRounds && selectedRounds !== "All") query.append('round', selectedRounds);

    let url = '';
    switch (activeTab) {
      case 'win':
        url = `/api/records/sets/count${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'straight':
        url = `/api/records/sets/straights${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'decider':
        url = `/api/records/sets/deciders${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'won1st':
        url = `/api/records/sets/won1st${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'lost1st':
        url = `/api/records/sets/lost1st${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'won1st2nd':
        url = `/api/records/sets/won1st2nd${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'lost1st2nd':
        url = `/api/records/sets/lost1st2nd${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'split1st2nd':
        url = `/api/records/sets/split1st2nd${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'up2to1':
        url = `/api/records/sets/up2to1${query.toString() ? '?' + query.toString() : ''}`;
        break;
      case 'down2to1':
        url = `/api/records/sets/down2to1${query.toString() ? '?' + query.toString() : ''}`;
        break;
      default:
        url = `/api/records/sets/count${query.toString() ? '?' + query.toString() : ''}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(resp => setData(resp.records || []))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedBestOf, activeTab, selectedRounds]);

  const renderTable = () => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1">Player</th>
          <th className="text-left py-1">Wins</th>
          <th className="text-left py-1">Losses</th>
          <th className="text-left py-1">Total Matches</th>
          <th className="text-left py-1">Win %</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-2 text-gray-500">No data</td>
          </tr>
        ) : (
          data.map(p => (
            <tr key={p.player.id} className="border-b">
              <td className="py-1 flex items-center gap-1">
                <span>{flagEmoji(iocToIso2(p.player.ioc)) || ''}</span>
                <Link
                  href={`/players/${encodeURIComponent(String(p.player.id))}`}
                  className="text-blue-700 hover:underline"
                >
                  {p.player.name}
                </Link>
              </td>
              <td className="py-1">{p.wins}</td>
              <td className="py-1">{p.losses || p.totalMatches - p.wins}</td>
              <td className="py-1">{p.totalMatches}</td>
              <td className="py-1">{p.winPercentage.toFixed(1)}%</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  if (error) return <div className="text-red-600">Error loading data</div>;

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4">
        <button
          onClick={() => setActiveTab('win')}
          className={`px-4 py-2 mr-2 ${activeTab === 'win' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Wins
        </button>
        <button
          onClick={() => setActiveTab('straight')}
          className={`px-4 py-2 mr-2 ${activeTab === 'straight' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Straight Sets
        </button>
        <button
          onClick={() => setActiveTab('decider')}
          className={`px-4 py-2 mr-2 ${activeTab === 'decider' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Deciders
        </button>
        <button
          onClick={() => setActiveTab('won1st')}
          className={`px-4 py-2 mr-2 ${activeTab === 'won1st' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          After Winning 1st
        </button>
        <button
          onClick={() => setActiveTab('lost1st')}
          className={`px-4 py-2 mr-2 ${activeTab === 'lost1st' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          After Losing 1st
        </button>
        <button
          onClick={() => setActiveTab('won1st2nd')}
          className={`px-4 py-2 mr-2 ${activeTab === 'won1st2nd' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          After Winning 1st&2nd
        </button>
        <button
          onClick={() => setActiveTab('lost1st2nd')}
          className={`px-4 py-2 mr-2 ${activeTab === 'lost1st2nd' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          After Losing 1st&2nd
        </button>
        <button
          onClick={() => setActiveTab('split1st2nd')}
          className={`px-4 py-2 mr-2 ${activeTab === 'split1st2nd' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          After Splitting 1st&2nd
        </button>
        <button
          onClick={() => setActiveTab('up2to1')}
          className={`px-4 py-2 mr-2 ${activeTab === 'up2to1' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Up 2 to 1
        </button>
        <button
          onClick={() => setActiveTab('down2to1')}
          className={`px-4 py-2 mr-2 ${activeTab === 'down2to1' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
           Down 1 to 2
        </button>
      </div>

      {/* Filtro Best Of */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Filter by Best Of</h4>
        <div className="flex gap-4 flex-wrap">
          {bestOfOptions.map(bo => (
            <label
              key={bo}
              className={`flex items-center gap-1 cursor-pointer select-none ${
                selectedBestOf.has(bo) ? 'font-semibold text-blue-700' : 'text-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedBestOf.has(bo)}
                onChange={() => toggleBestOf(bo)}
                className="accent-blue-500"
              />
              Best of {bo}
            </label>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h3 className="text-md font-semibold mb-2">
            {activeTab === 'win' ? 'Win Percentage' :
             activeTab === 'straight' ? 'Straight Sets Win Percentage' :
             activeTab === 'decider' ? 'Deciders Win Percentage' :
             activeTab === 'won1st' ? 'After Winning 1st Set Win Percentage' :
             activeTab === 'lost1st' ? 'After Losing 1st Set Win Percentage' :
             activeTab === 'won1st2nd' ? 'After Winning 1st&2nd Sets Win Percentage' :
             activeTab === 'lost1st2nd' ? 'After Losing 1st&2nd Sets Win Percentage' :
             activeTab === 'split1st2nd' ? 'After Splitting 1st&2nd Sets Win Percentage' :
             activeTab === 'up2to1' ? 'Up 2 to 1 Win Percentage' :
             'Down 1 to 2 Win Percentage'}
          </h3>
          {renderTable()}
        </div>
      )}
    </div>
  );
}