import React from 'react';
import type { RecordRow } from 'lib/getRecords';

export default function RecordsTable({ data }: { data: RecordRow[] }) {
  if (!data || data.length === 0) return <div className="text-center text-gray-400">No data available</div>;
  const keys = Object.keys(data[0]);
  return (
    <table className="w-full table-auto text-center text-sm">
      <thead>
        <tr className="text-gray-300">
          {keys.map(k => (
            <th key={k} className="px-2 py-1 font-medium">{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-900/30' : ''}>
            {keys.map((k, j) => (
              <td key={j} className="px-2 py-1 text-gray-200">{String(row[k] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
