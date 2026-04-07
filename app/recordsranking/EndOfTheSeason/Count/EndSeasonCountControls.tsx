"use client";

import React from 'react';
import DropdownNavSelect from '@/components/DropdownNavSelect';

export default function EndSeasonCountControls({ initialRank, hideLabel = false }: { initialRank: number, hideLabel?: boolean }) {
  const options = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `No. ${i + 1}` }));

  return (
    <div className="flex items-center gap-4 mb-4">
      {!hideLabel && <label className="text-gray-200 font-medium">Rank:</label>}
      <DropdownNavSelect name="rank" value={String(initialRank)} options={options} pathMode />
    </div>
  );
} 
