'use client'

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface FirstNProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
}

interface Match {
  winner_id: number;
  loser_id: number;
  winner_name: string;
  loser_name: string;
  winner_ioc: string | null;
  loser_ioc: string | null;
  tourney_date: string;
}

interface FirstNRecord {
  player: { id: string; name: string; ioc: string };
  matches: Match[];
  totalMatches: number;
  winsInFirstN?: number; // Aggiunto per calcolo dinamico
}

export default function FirstN({ selectedSurfaces, selectedLevels, selectedRounds }: FirstNProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [n, setN] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    if (selectedRounds && selectedRounds !== "All") query.append('round', selectedRounds);
    const url = `/api/records/firstn/count${query.toString() ? '?' + query.toString() : ''}`;

    fetch(url)
      .then(res => res.json())
      .then((data) => setData(data))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data, n]);

  // Calcola dinamicamente winsInFirstN basato su n
  const computedRecords = useMemo(() => {
    if (!data || !data.records) return [];
    return data.records.map((record: FirstNRecord) => {
      const firstNMatches = record.matches.slice(0, n);
      let wins = 0;
      for (const match of firstNMatches) {
        if (String(match.winner_id) === record.player.id) {
          wins++;
        }
      }
      return {
        ...record,
        winsInFirstN: wins,
      };
    }).filter((record: FirstNRecord) => record.matches.length >= n) // Solo giocatori con almeno N match
      .sort((a: FirstNRecord, b: FirstNRecord) => b.winsInFirstN! - a.winsInFirstN!);
  }, [data, n]);

  const totalPages = Math.ceil(computedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = computedRecords.slice(startIndex, startIndex + itemsPerPage);

  const getPagesToShow = (current: number, total: number) => {
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 4) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 3) pages.push('...');
      pages.push(total);
    }
    return pages;
  };

  const pagesToShow = getPagesToShow(currentPage, totalPages);

  if (error) return <div>Error loading data</div>;
  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3 className="text-md font-semibold mb-2">Wins in First N Matches</h3>
      <div className="mb-4">
        <label htmlFor="n-input" className="mr-2">Number of matches:</label>
        <input
          id="n-input"
          type="number"
          min="1"
          max="1600"
          value={n}
          onChange={(e) => setN(parseInt(e.target.value, 10) || 1)}
          className="border rounded px-2 py-1 w-20"
        />
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Player</th>
            <th className="text-left py-1">Wins in First {n}</th>
            <th className="text-left py-1">Win Percentage</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRecords.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-2 text-gray-500">No data</td>
            </tr>
          ) : (
            paginatedRecords.map((p: FirstNRecord, index: number) => (
              <tr key={index} className="border-b">
                <td className="py-1">
                  <span className="text-base mr-1">{flagEmoji(iocToIso2(p.player.ioc)) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(String(p.player.id))}`} className="text-blue-700 hover:underline">
                    {p.player.name}
                  </Link>
                </td>
                <td className="py-1">{p.winsInFirstN}</td>
                <td className="py-1">{((p.winsInFirstN! / n) * 100).toFixed(1)}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Prev
          </button>
          {pagesToShow.map((page, index) => (
            page === '...' ? (
              <span key={index} className="px-3 py-1">...</span>
            ) : (
              <button
                key={index}
                onClick={() => setCurrentPage(page as number)}
                className={`px-3 py-1 rounded ${page === currentPage ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}
              >
                {page}
              </button>
            )
          ))}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}