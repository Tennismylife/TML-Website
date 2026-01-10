"use client";

import React from 'react';
import DropdownNavSelect from '@/components/DropdownNavSelect';

export default function StreakCountControls({ initialRank }: { initialRank: number }) {
  const options = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

  return (
    <div className="flex justify-start mb-6 ml-4 items-center">
      <label className="text-gray-200 font-medium mr-2">Rank:</label>
      <DropdownNavSelect name="rank" value={String(initialRank)} options={options} />
    </div>
  );
} 
