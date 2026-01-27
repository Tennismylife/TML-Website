import React from 'react';

export default function ResultsSkeleton() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex gap-2 mb-3">
          <div className="h-5 w-28 bg-gray-700/60 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-700/60 rounded animate-pulse" />
          <div className="h-5 w-16 bg-gray-700/60 rounded animate-pulse" />
        </div>
        <ul className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <li key={i} className="grid grid-cols-3 gap-2">
              <div className="h-4 bg-gray-700/60 rounded animate-pulse" />
              <div className="h-4 bg-gray-700/60 rounded animate-pulse" />
              <div className="h-4 bg-gray-700/60 rounded animate-pulse" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
